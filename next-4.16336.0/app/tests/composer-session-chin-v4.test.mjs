import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { closeWhenSettled } from './support/vite-ssr-settle.mjs';
import { extractComposerChinV4, ROOTS, ROOT_PINS, HOST_ADAPTERS, LINKED_AREAS, CDS_CORE_MANIFEST_SHA256, PINNED_DECLARATIONS } from '../scripts/extract-composer-chin-v4.mjs';
import { contract4 } from '../scripts/extract-code-composer.mjs';

// Round 3 relink rl-composer, task C1: the 4.16336.0 session chin (c227f4d5e X6, the chunk's export g) cut into its own
// graph (scripts/extract-composer-chin-v4.mjs -> src/generated/composer-chin-v4, ComposerSessionChin), so code-composer-v4
// and its downstream graphs keep their bytes. Source and SSR only: manifest, the generator's --check, the official chunk
// text, D1 links, the host answers (src/source-composer-chin-adapters.jsx), and the row layout's DOM through Vite.
const app = path.resolve(import.meta.dirname, '..');
const ion = path.resolve(app, '../reference/snapshots/claude-4.16336.0-20261104/ion-dist/assets/v1');
const official = name => fs.readFileSync(path.join(ion, name), 'utf8');
const local = rel => fs.readFileSync(path.join(app, rel), 'utf8');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const h = React.createElement;
const out = 'src/generated/composer-chin-v4';
const manifest = JSON.parse(local(`${out}/manifest.json`));
const provenance = JSON.parse(local(`${out}/provenance.json`));

let server, gen, adapters;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  // FH's answer is the frame graph's useIsDesktopApp (frame-sidebar-adapter.mjs); the test installs the host table the
  // way frame-sidebar-host.jsx does for the app.
  const frame = await server.ssrLoadModule('/src/frame-sidebar-adapter.mjs');
  frame.installFrameSidebarHost({ useIsDesktopApp: () => true });
  gen = await server.ssrLoadModule(`/${out}/index.mjs`);
  adapters = await server.ssrLoadModule('/src/source-composer-chin-adapters.jsx');
});
after(async () => { await closeWhenSettled(server); await server.close(); });

test('manifest: 4.16336.0 contract, cds-core pin, the seven chunks of X6\'s closure, linked graphs', () => {
  assert.equal(manifest.referenceVersion, '4.16336.0');
  assert.equal(manifest.generator, 'scripts/extract-composer-chin-v4.mjs');
  assert.equal(manifest.adapterModule, 'src/source-composer-chin-adapters.jsx');
  assert.equal(sha(fs.readFileSync(path.join(app, 'src/generated/cds-core/manifest.json'))), CDS_CORE_MANIFEST_SHA256);
  assert.equal(provenance.sharedGraph.manifestSha256, CDS_CORE_MANIFEST_SHA256);
  assert.deepEqual(manifest.modules.map(m => m.target).sort(), ['cf059c6df.mjs', 'cfca6870a.mjs', 'composer-session-chin.mjs', 'shared-1.mjs',
    'shared-212.mjs', 'shared-33.mjs', 'shared-62.mjs']);
  assert.equal(manifest.modules.reduce((n, m) => n + m.bindings.length, 0), 36);
  assert.deepEqual(LINKED_AREAS, ['code-composer-v4', 'routines-shared-v4', 'files-changes-v4', 'session-rail-kit-v4']);
  for (const area of LINKED_AREAS) assert.equal(provenance.linkedAreas[area], sha(fs.readFileSync(path.join(app, 'src/generated', area, 'manifest.json'))), area);
});

test('root: X6 is the only declaration carrying its features, exported as g, its raw declaration pinned', () => {
  const chunk = official('c227f4d5e-DGDdGBTz.js');
  assert.match(chunk, /\bX6 as g\b/);
  assert.equal(ROOTS['c227f4d5e-DGDdGBTz.js'].X6.name, 'ComposerSessionChin');
  const [root] = provenance.roots;
  assert.deepEqual({ file: root.file, local: root.local, export: root.export, pinned: root.pinned }, { file: 'c227f4d5e-DGDdGBTz.js', local: 'X6', export: 'g', pinned: true });
  assert.equal(root.declarationSha256, ROOT_PINS['c227f4d5e-DGDdGBTz.js#X6']);
  const raw = chunk.slice(chunk.indexOf('X6=A(function(e){'));
  assert.ok(raw.startsWith('X6=A(function(e){let $=J9(263),{sessionRef:t,'));
  // c73f45bc3 aS: the open session's row chin is X6 through $x(e, "row") (pinned on the minified bytes).
  assert.ok(official('c73f45bc3-C7dtUSq8.js').includes('aS=Cr(c(function(e){return $x(e,"row")??r(Sr.Chin,{className:"-mt-1.5 -mb-2.5 md:-my-2"'));
  assert.equal(manifest.callSites.length, 2);
});

test('boundaries: every stop is a host answer of the adapter module; FH is the frame graph\'s function, intl the composer\'s', () => {
  assert.equal(Object.keys(HOST_ADAPTERS).length, 15);
  const adapted = new Set(manifest.modules.flatMap(m => m.imports.filter(i => i.kind === 'adapter').map(i => i.name)));
  assert.deepEqual([...adapted].sort(), Object.values(HOST_ADAPTERS).map(a => a.name).sort());
  for (const m of manifest.modules) for (const i of m.imports.filter(i => i.kind === 'adapter')) assert.equal(i.from, '../../source-composer-chin-adapters.jsx');
  for (const a of provenance.adapters) assert.equal(a.pinned, true, a.original);
  const text = local('src/source-composer-chin-adapters.jsx');
  assert.ok(text.includes('export { useIsDesktopApp } from "./frame-sidebar-adapter.mjs";'));
  assert.ok(text.includes('export { useComposerIntl } from "./source-composer-current-adapters.jsx";'));
  assert.ok(text.includes('export const ComposerChinShellParts = Object.freeze({ Chin: ChatComposerParts.Chin });'));
  // D1: the Chin the hh answer hands X6 is code-composer-v4's (one ChatComposer shell), not a second copy.
  assert.match(text, /import \{ ChatComposerParts \} from "\.\/generated\/code-composer-v4\/chat-composer-shell\.mjs";/);
});

test('D1: X6 links code-composer-v4 / routines-shared-v4 / files-changes-v4 / session-rail-kit-v4 instead of cutting them again', () => {
  const chin = local(`${out}/composer-session-chin.mjs`);
  assert.match(chin, /useComposerFinalFocus as R6 \} from "\.\.\/code-composer-v4\/composer-final-focus\.mjs"/);
  assert.match(chin, /ModeTriggerLabel as j6 \} from "\.\.\/code-composer-v4\/composer-row-chin\.mjs"/);
  assert.match(chin, /popoverCollisionPadding as ps \} from "\.\.\/files-changes-v4\/popover-collision-padding\.mjs"/);
  // wave 8b (R4-K1): c227f4d5e tE (the chin context) is cds-core's since wave 8b (ctx_c227f4d5e_tE); was
  // assert.match(chin, /from "\.\.\/session-rail-kit-v4\/c227f4d5e-DGDdGBTz\.mjs"/) (session-rail-kit-v4 held it).
  assert.match(chin, /^import \{ tE \} from "\.\.\/cds-core\/c227f4d5e\.mjs";$/m);
  assert.doesNotMatch(chin, /^var tE = /m);
  for (const file of fs.readdirSync(path.join(app, out)).filter(n => n.endsWith('.mjs')))
    assert.doesNotMatch(local(`${out}/${file}`), /react\.transitional\.element|__CLIENT_INTERNALS/, file);
});

test('code-composer-v4 contract4: the X6 row strings became the raw declaration pins this graph records', () => {
  const spec = contract4.modules.find(m => m.target === 'composer-row-chin.mjs');
  assert.deepEqual(Object.keys(spec.declarationPins), ['X6', 'J6', 'O3']);
  assert.equal(spec.declarationPinsMirror, 'src/generated/composer-chin-v4/provenance.json');
  assert.deepEqual(PINNED_DECLARATIONS, ['J6', 'O3']);
  assert.equal(spec.declarationPins.X6, provenance.roots[0].declarationSha256);
  for (const local of PINNED_DECLARATIONS) assert.equal(spec.declarationPins[local], provenance.pinnedDeclarations[`c227f4d5e-DGDdGBTz.js#${local}`], local);
  for (const gone of ['tt ? ln && p("span", { "aria-hidden": !0 })', '"invisible before:content-[attr(data-placeholder-label)]"'])
    assert.ok(!spec.chunkFeatures.some(f => (typeof f === 'string' ? f : f.loose) === gone), gone);
});

const rowProps = (extra = {}) => ({ layout: 'row', modelId: 'm', modelItems: [{ id: 'm' }], permissionLabel: 'Auto', permissionItems: [{ id: 'auto', label: 'Auto', onSelect() {} }],
  hideDictation: true, renderModelSelector: p => h('button', { type: 'button', className: 'sc-model-trigger', 'data-placement': p.placement }, 'Test model Low'), ...extra });

test('SSR row layout: X6\'s official chin DOM (row class, empty aria-hidden leading, trailing order, 14px ring in the gp slot)', () => {
  const host = { requestMenu() {}, usage: { pct: 42, tooltip: 'Context', 'aria-label': 'Usage', className: 'sc-usage-trigger' }, modePickerAnchor: { current: null } };
  const html = renderToStaticMarkup(h(adapters.ComposerChinHostContext.Provider, { value: host }, h(gen.ComposerSessionChin, rowProps())));
  assert.match(html, /^<div data-cds="ChatComposerChin"[^>]* class="[^"]*-mt-1\.5 -mb-2\.5 md:-my-2"/);
  assert.match(html, /<div class="flex items-center self-start"><span aria-hidden="true"><\/span><\/div>/);
  const trailing = html.indexOf('grid min-w-0 grid-flow-col auto-cols-[minmax(0,max-content)] items-center gap-1 [--cds-h-control:calc(1.5rem*var(--cds-rem-scale,1))] [--cds-pad-md:calc(0.375rem*var(--cds-rem-scale,1))] [--cds-font-size-body:calc(0.8125rem*var(--cds-rem-scale,1))] [--cds-leading-body:calc(1.25rem*var(--cds-rem-scale,1))] compact:me-1');
  assert.ok(trailing > 0);
  const model = html.indexOf('data-placement="row"'), mode = html.indexOf('<span class="inline-flex min-w-0"><button'), ring = html.indexOf('<span class="flex shrink-0 ms-px"><button');
  assert.ok(trailing < model && model < mode && mode < ring, `${model} ${mode} ${ring}`);
  assert.match(html.slice(mode), /^<span class="inline-flex min-w-0"><button[^>]*class="[^"]* min-w-0 shrink"[^>]*aria-haspopup="menu" aria-expanded="false"/);
  assert.match(html.slice(ring), /<svg width="14" height="14"[^>]*><circle[^>]*stroke="var\(--cds-alpha-3\)" data-ring-track="">/);
  assert.match(html, /<span role="status" aria-live="polite" class="sr-only">Fast mode off<\/span>/);
});

test('SSR without the host context: the pickers stay closed and X6\'s ring slot is empty', () => {
  const html = renderToStaticMarkup(h(gen.ComposerSessionChin, rowProps()));
  assert.doesNotMatch(html, /ms-px/);
  assert.match(html, /aria-expanded="false"/);
});

test('host answers: W6 keeps the official popups closed and asks the host menus; the gated branches throw', () => {
  const asked = [];
  let result;
  const Probe = () => { result = adapters.useComposerChinPickers({ modeItems: [1], permissionModeItems: undefined }); return null; };
  const anchor = { current: { id: 'anchor' } };
  renderToStaticMarkup(h(adapters.ComposerChinHostContext.Provider, { value: { requestMenu: (k, a) => asked.push([k, a]), modePickerAnchor: anchor } }, h(Probe)));
  assert.deepEqual([result.modeOpen, result.modelOpen, result.effortOpen, result.permissionModeOpen], [false, false, false, false]);
  assert.deepEqual(result.numberedModeItems, [1]);
  assert.deepEqual(result.permissionModeMenuItems, []);
  result.onModeOpenChange(true); result.onModelOpenChange(true); result.onEffortOpenChange(false); result.requestOpen('mode'); result.requestOpen('model');
  assert.deepEqual(asked, [['permission', anchor.current], ['model', anchor.current], ['permission', null], ['model', null]]);
  assert.equal(adapters.useSessionHidesModePicker(), false);
  assert.equal(adapters.isComposerOnRoute(null, 'settings'), false);
  assert.equal(adapters.useEngineFooterRegistry('x'), null);
  for (const C of [adapters.ComposerRailPickerKeys, adapters.ComposerDictationButton, adapters.ComposerChinPlusMenu, adapters.ComposerCoordinatorToggle, adapters.ComposerRailModelRow, adapters.ComposerRailModeRow])
    assert.throws(() => renderToStaticMarkup(h(C)), /composer-chin-v4: .* is not reachable/);
});

test('--check: the generated graph is byte for byte the generator\'s output', async () => {
  await extractComposerChinV4({ check: true });
});
