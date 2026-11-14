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
import { extractApprovalElicitationV4, ROOTS, ROOT_PINS, HOST_ADAPTERS, LINKED_AREAS, CDS_CORE_MANIFEST_SHA256, CARD } from '../scripts/extract-approval-elicitation-v4.mjs';

// round2 unit approval-elicitation: the 4.16336.0 MCP elicitation form (c9e77b76c j ElicitationField, cd359c6df k
// ElicitationForm, ce3d4614c o / s the initial values and the submit-time read; scripts/extract-approval-elicitation-v4.mjs
// -> src/generated/approval-elicitation-v4), which src/source-approval-card.jsx renders since the round-3 switch S8 (the
// 3.6556.2 src/generated/approval-elicitation stays on disk, byte for byte, until batch 11 removes it). Source only: manifest, the generator's --check, the official chunk text, the
// links it reads (D1), and SSR through Vite with the routines-shared host useIntl.
const app = path.resolve(import.meta.dirname, '..');
const ion = path.resolve(app, '../reference/snapshots/claude-4.16336.0-20261104/ion-dist');
const official = name => fs.readFileSync(path.join(ion, 'assets/v1', name), 'utf8');
const local = rel => fs.readFileSync(path.join(app, rel), 'utf8');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const h = React.createElement;
const out = 'src/generated/approval-elicitation-v4';
const manifest = JSON.parse(local(`${out}/manifest.json`));
const provenance = JSON.parse(local(`${out}/provenance.json`));

globalThis.document ??= { body: { nodeType: 1 }, head: { appendChild() {}, querySelector: () => null }, createElement: () => ({ relList: { supports: () => false }, setAttribute() {}, style: {} }),
  querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, removeEventListener() {}, documentElement: { dataset: {}, style: {}, getAttribute: () => null, hasAttribute: () => false }, cookie: '' };
globalThis.window ??= { document: globalThis.document, navigator: { userAgent: 'Mozilla/5.0 (Macintosh)' }, addEventListener() {}, removeEventListener() {},
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }), localStorage: { getItem: () => null, setItem() {} },
  location: { pathname: '/', search: '', hash: '', href: 'app://local/' }, history: { state: null, replaceState() {} } };

let server, gen, adapters, i18n;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  i18n = await server.ssrLoadModule('/electron/i18n/index.mjs');
  i18n.setLocale('en-US');
  gen = await server.ssrLoadModule(`/${out}/index.mjs`);
  adapters = await server.ssrLoadModule('/src/source-approval-elicitation-v4-adapters.jsx');
});
after(async () => { i18n?.setLocale('en-US'); await closeWhenSettled(server); await server.close(); });

const schema = { type: 'object', required: ['title', 'count'], properties: {
  title: { type: 'string', title: 'Title', description: 'A short name', minLength: 2 },
  count: { type: 'integer', title: 'Count', minimum: 1, maximum: 5 },
  notify: { type: 'boolean', title: 'Notify me', default: true },
  tier: { type: 'string', title: 'Tier', oneOf: [{ const: 'basic', title: 'Basic' }, { const: 'pro', title: 'Pro' }], default: 'pro' },
  tags: { type: 'array', title: 'Tags', items: { type: 'string', enum: ['unit', 'ui'] }, default: ['ui', 'other', 3] },
  email: { type: 'string', format: 'email', title: 'Email' },
} };

test('manifest: 4.16336.0 snapshot, cds-core shared graph, linked areas and modules, pinned roots; --check', async () => {
  assert.equal(manifest.referenceVersion, '4.16336.0');
  assert.equal(manifest.referenceSnapshot, 'snapshots/claude-4.16336.0-20261104');
  assert.equal(manifest.generator, 'scripts/extract-approval-elicitation-v4.mjs');
  assert.equal(manifest.adapterModule, 'src/source-approval-elicitation-v4-adapters.jsx');
  assert.equal(manifest.sharedGraph, 'cds-core');
  assert.deepEqual(manifest.linkedAreas, LINKED_AREAS);
  assert.equal(provenance.sharedGraph.manifestSha256, CDS_CORE_MANIFEST_SHA256);
  assert.equal(sha(fs.readFileSync(path.join(app, 'src/generated/cds-core/manifest.json'))), CDS_CORE_MANIFEST_SHA256);
  for (const [area, pinned] of Object.entries(provenance.linkedAreas)) {
    const bytes = fs.readFileSync(path.join(app, 'src/generated', area, 'manifest.json'));
    if (typeof pinned === 'string') { assert.equal(sha(bytes), pinned, area); continue; }
    const linked = JSON.parse(bytes.toString());
    for (const [target, moduleSha] of Object.entries(pinned)) {
      assert.equal(linked.modules.find(m => m.target === target)?.sha256, moduleSha, `${area}/${target}`);
      assert.equal(sha(fs.readFileSync(path.join(app, 'src/generated', area, target))), moduleSha, `${area}/${target} bytes`);
    }
  }
  for (const mod of manifest.modules) {
    assert.equal(mod.referenceVersion, '4.16336.0', mod.target);
    assert.equal(mod.sourceSha256, sha(fs.readFileSync(path.join(ion, 'assets/v1', mod.source))), mod.source);
    assert.equal(mod.sha256, sha(local(`${out}/${mod.target}`)), mod.target);
  }
  // Every root located on the official AST and pinned; the published names are the 3.6556.2 graph's.
  assert.deepEqual(provenance.roots.map(r => [r.name, `${r.file}#${r.local}`, r.export, r.declarationSha256]),
    Object.entries(ROOTS).flatMap(([file, rs]) => Object.entries(rs).map(([l, r]) => [r.name, `${file}#${l}`, r.export, ROOT_PINS[`${file}#${l}`]])));
  assert.deepEqual(Object.keys(gen).sort(), ['ElicitationField', 'ElicitationForm', 'elicitationInitialValues', 'readElicitationForm']);
  const old = JSON.parse(local('src/generated/approval-elicitation/manifest.json'));
  assert.equal(old.referenceVersion, '3.6556.2', 'the 3.6556.2 output stays on disk until batch 11');
  // Production (round-3 switch S8): the card imports exactly these four names from the 4.16336.0 graph, and no host file
  // imports the 3.6556.2 folder any more.
  assert.match(local('src/source-approval-card.jsx'), /^import \{ ElicitationField, ElicitationForm, elicitationInitialValues as formInitialValues, readElicitationForm \} from "\.\/generated\/approval-elicitation-v4\/index\.mjs";$/m);
  for (const file of fs.readdirSync(path.join(app, 'src')).filter(name => /\.(m?js|jsx)$/.test(name)))
    assert.doesNotMatch(local(`src/${file}`), /from ['"]\.\/generated\/approval-elicitation\//, `host ${file} imports the 3.6556.2 approval-elicitation graph`);
  assert.deepEqual(Object.keys(JSON.parse(local('src/generated/approval-elicitation/manifest.json')).publicNames).sort(), Object.keys(gen).sort());
  await extractApprovalElicitationV4({ check: true });
});

test('official text: the card mounts this form; the old links are answered by 4.16336.0 graphs (D1), never by 3.6556.2 folders', () => {
  const card = official(CARD);
  for (const site of manifest.callSites) for (const feature of site.features) assert.equal(card.split(feature).length - 1, 1, feature);
  const imports = provenance.imports;
  const from = via => imports.find(i => i.via === via);
  // mcp-app-host zod.mjs (3.6556.2) -> the 4.16336.0 vendor-zod (same chunk bytes). cds-core wave 8 (W8-M1, publish table
  // zod: zod_vendorzod_vs / _cc / _Ks) publishes vs, cc and Ks, so they are linked from cds-core; ic stays frame-sidebar-nav's.
  // (wave 7: all four from '../frame-sidebar-nav/vendor-zod.mjs'.)
  for (const [alias, name, owner] of [['A', 'vs', 'cds-core'], ['N', 'ic', 'frame-sidebar-nav'], ['u', 'cc', 'cds-core'], ['w', 'Ks', 'cds-core']])
    assert.deepEqual([from(`vendor-zod-fszujTq6.js:${alias}`)?.from, from(`vendor-zod-fszujTq6.js:${alias}`)?.name], [`../${owner}/vendor-zod.mjs`, name]);
  // cowork-scheduled cff2bf6cb#nu re-located to cff2bf6cb-HE-LaYyC (export t); approval-titles shared-9 LO -> shared-38 c.
  assert.equal(from('cff2bf6cb-HE-LaYyC.js:t')?.from, '../cowork-scheduled-v4/cff2bf6cb-HE-LaYyC.mjs');
  assert.equal(from('shared-38-DyF0_Fim.js:c')?.from, '../approval-titles-v4/shared-38-DyF0_Fim.mjs');
  for (const i of imports) {
    assert.doesNotMatch(i.from, /^\.\.\/(approval-titles|cowork-scheduled|routines-shared|mcp-app-host|view-tabs)\//, `${i.module} ${i.local} reads a 3.6556.2 folder`);
    if (i.kind === 'linked') {
      const area = i.from.split('/')[1];
      assert.equal(JSON.parse(local(`src/generated/${area}/manifest.json`)).referenceVersion, '4.16336.0', area);
    }
  }
  // React only through the host's one copy; the host boundary is the routines-shared useIntl.
  for (const mod of manifest.modules) for (const i of mod.imports) if (i.kind === 'react') assert.match(i.from, /^react(\/jsx-runtime|-dom)?$/);
  assert.deepEqual(provenance.adapters.map(a => [a.original, a.name, a.hostAdapter]), Object.entries(HOST_ADAPTERS).map(([k, a]) => [k, a.name, a.from]));
  for (const file of fs.readdirSync(path.join(app, out)).filter(f => f.endsWith('.mjs')))
    assert.doesNotMatch(local(`${out}/${file}`), /\.node\b["']|require\(/, file);
});

test('initial values: the schema defaults, booleans only as booleans, arrays filtered to their enum (ce3d4614c o)', () => {
  assert.deepEqual({ ...gen.elicitationInitialValues(schema) }, { notify: true, tier: 'pro', tags: ['ui'] });
  assert.deepEqual({ ...gen.elicitationInitialValues({ properties: { b: { type: 'boolean', default: 'yes' }, s: { type: 'string' } } }) }, {});
});

// readElicitationForm (ce3d4614c s) reads the controls through `new FormData(form)`: Node's FormData does not read a form
// element, so the test gives it one that answers from the control values the form would hold.
function withFormData(values, run) {
  const Original = globalThis.FormData;
  globalThis.FormData = class { constructor(form) { this.values = form.values; } get(name) { return Object.hasOwn(this.values, name) ? this.values[name] : null; } };
  try { return run({ values }); } finally { globalThis.FormData = Original; }
}
function captureIntl() {
  let intl;
  renderToStaticMarkup(h(function Probe() { intl = adapters.useIntl(); return null; }));
  return intl;
}

// Every non-empty value is validated through zod (c9e77b76c N -> P -> safeParse), which reads zod's global config
// `M = globalThis.__zod_globalConfig`. Since cds-core wave 7 (W7-D5) the module state M and the official chunk's
// initializer `(Le=globalThis).__zod_globalConfig??(Le.__zod_globalConfig={})` are cds-core vendor-zod.mjs's, and
// frame-sidebar-nav vendor-zod.mjs (the owner of the zod helpers this graph links, never re-cuts) imports M from there,
// so an isolated load initializes the config and the typed read below runs as a regular test (it was a todo before).
const field = n => `elicit:${JSON.stringify(n)}`;

test('zod global config: cds-core vendor-zod carries the official initializer, frame-sidebar-nav vendor-zod imports M from it', () => {
  const vendorZod = official('vendor-zod-fszujTq6.js');
  assert.ok(vendorZod.includes('(Le=globalThis).__zod_globalConfig??(Le.__zod_globalConfig={})'), 'official vendor-zod initializer');
  const core = local('src/generated/cds-core/vendor-zod.mjs');
  assert.match(core, /^\(Le = globalThis\)\.__zod_globalConfig \?\? \(Le\.__zod_globalConfig = \{\}\);\nvar M = globalThis\.__zod_globalConfig;$/m);
  const nav = local('src/generated/frame-sidebar-nav/vendor-zod.mjs');
  const navImport = /^import \{([^}]*)\} from "\.\.\/cds-core\/vendor-zod\.mjs";/m.exec(nav);
  // cds-integrate wave 8a (R4-K1 addendum A, identity family): the zod schema values that read M are cds-core links
  // themselves now (identity_vendorzod_*, one owner), so frame-sidebar-nav's vendor-zod no longer reaches M at all.
  // Was: assert.ok(navImport && navImport[1].split(',').map(s => s.trim()).includes('M'), 'frame-sidebar-nav vendor-zod imports M from cds-core');
  // Still strict: the nav module links its zod helpers from cds-core, never re-cuts M, and every read of vendor-zod M
  // anywhere in the frame-sidebar-nav graph imports it from cds-core.
  assert.ok(navImport && navImport[1].split(',').map(s => s.trim()).filter(Boolean).length > 0, 'frame-sidebar-nav vendor-zod links from cds-core');
  assert.doesNotMatch(nav, /^var M = /m, 'frame-sidebar-nav does not re-cut M');
  const navManifest = JSON.parse(local('src/generated/frame-sidebar-nav/manifest.json'));
  for (const m of navManifest.modules) {
    if (m.source === 'vendor-zod-fszujTq6.js') assert.ok(!m.bindings.some(b => b.name === 'M'), `${m.target} does not re-cut M`);
    for (const i of m.imports ?? []) if (i.via === 'vendor-zod-fszujTq6.js#M') assert.equal(i.from, '../cds-core/vendor-zod.mjs', `vendor-zod M <- cds-core (${m.target})`);
  }
});

test('submit-time read without values: required fields kept empty and named, empty optional fields left out (ce3d4614c s)', () => {
  const intl = captureIntl();
  const empty = withFormData({}, form => gen.readElicitationForm(form, schema, intl));
  assert.deepEqual({ ...empty.data }, { title: '', count: '' });
  assert.deepEqual([...empty.invalidFields].sort(), ['count', 'title']);
  const blank = withFormData({ [field('title')]: '', [field('tags')]: '[]' }, form => gen.readElicitationForm(form, schema, intl));
  assert.deepEqual({ ...blank.data }, { title: '', count: '' });
  assert.deepEqual([...blank.invalidFields].sort(), ['count', 'title']);
});

test('submit-time read: numbers, booleans and arrays typed, invalid values named (ce3d4614c s, zod checks)', () => {
  const intl = captureIntl();
  const ok = withFormData({ [field('title')]: 'Hi there', [field('count')]: '3', [field('notify')]: 'true', [field('tags')]: '["unit","x"]', [field('email')]: '' },
    form => gen.readElicitationForm(form, schema, intl));
  assert.deepEqual({ ...ok.data }, { title: 'Hi there', count: 3, notify: true, tags: ['unit'] });
  assert.deepEqual([...ok.invalidFields], []);
  const bad = withFormData({ [field('title')]: 'H', [field('count')]: '9', [field('email')]: 'nope' }, form => gen.readElicitationForm(form, schema, intl));
  assert.deepEqual([...bad.invalidFields].sort(), ['count', 'email', 'title']);
});

test('SSR: the Base UI form (data-cds="Form", small gap) with one field per property, label, required mark, description', () => {
  const fields = Object.entries(schema.properties).map(([fieldName, fieldSchema]) => h(gen.ElicitationField, { key: fieldName, fieldName, fieldSchema,
    isRequired: schema.required.includes(fieldName), initialValue: gen.elicitationInitialValues(schema)[fieldName], hasSubmitError: false, clearSubmitError() {} }));
  const html = renderToStaticMarkup(h(gen.ElicitationForm, { id: 'elicit-form', size: 'sm', submitOnModEnter: false, 'data-testid': 'epitaxy-elicitation-form' }, fields));
  assert.match(html, /^<form /);
  assert.match(html, /data-cds="Form"/);
  assert.match(html, /id="elicit-form"/);
  assert.match(html, /class="flex flex-col gap-sm"/);
  assert.match(html, /noValidate=""/i);
  for (const label of ['Title', 'Count', 'Notify me', 'Tier', 'Tags', 'Email']) assert.ok(html.includes(`>${label}<`) || html.includes(label), label);
  assert.equal((html.match(/class="ms-0.5 text-danger"/g) ?? []).length, 2, 'title and count are required');
  assert.match(html, /\[unicode-bidi:plaintext\]">A short name</);
  assert.match(html, /name="elicit:&quot;title&quot;"/);
  // A field the official form cannot draw (an object) renders nothing.
  assert.equal(renderToStaticMarkup(h(gen.ElicitationField, { fieldName: 'nested', fieldSchema: { type: 'object' }, isRequired: false, hasSubmitError: false, clearSubmitError() {} })), '');
});

test('SSR: a submit error shows the original message under the field', () => {
  const intl = captureIntl();
  const html = renderToStaticMarkup(h(gen.ElicitationForm, { size: 'sm' },
    h(gen.ElicitationField, { fieldName: 'title', fieldSchema: schema.properties.title, isRequired: true, initialValue: '', hasSubmitError: true, clearSubmitError() {} })));
  assert.ok(intl);
  assert.match(html, /This field is required\./);
  assert.match(html, /aria-invalid="true"|data-invalid=""/);
});
