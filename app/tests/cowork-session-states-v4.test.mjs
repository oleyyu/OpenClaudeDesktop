import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { contracts, contractVersions, extractCoworkSessionStates, legacyConsumers } from '../scripts/extract-cowork-session-states.mjs';
import * as official4 from '../scripts/official-4.16336.0.mjs';

// Region batch 3 (4.16336.0 migration): cowork-session-states keeps its 3.6556.2 production graph byte for byte
// (session-rail, still 3.6556.2, links it by original identity: region-plan cutover.oldConsumersAtGeneration) and gains
// an isolated 4.16336.0 graph, src/generated/cowork-session-states-v4, cut by the same generator from the frozen
// snapshot over cds-core and the dependency region routines-shared-v4. Source only: generator output, official chunk
// text and SSR; no browser, no network.
const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'src/generated/cowork-session-states-v4');
const LEGACY = path.join(ROOT, 'src/generated/cowork-session-states');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const V4 = official4.referenceVersion;
const C21 = 'c21f11e6d-Cyj5xu_D.js';
const official = name => fs.readFile(path.join(official4.ionSource, name), 'utf8');
const h = React.createElement;
const text = html => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const NOTICE_CLASS = 'flex flex-col gap-4 rounded-t-xl border-0.5 bg-surface-1 p-6 font-sans text-secondary sm:flex-row sm:items-center sm:justify-between';

// W8 stub contract (design class c): cds-core now holds shared-0 CQ/Wo (read document.cookie at load) and the shared-25
// router store (reads window.location.pathname at load), as in the app.
globalThis.document ??= { cookie: '', body: { nodeType: 1 }, head: { appendChild() {} }, createElement: () => ({ relList: { supports: () => false }, setAttribute() {}, style: {} }),
  querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, removeEventListener() {}, documentElement: { dataset: {}, getAttribute: () => null, hasAttribute: () => false } };
globalThis.window ??= { document: globalThis.document, navigator: { userAgent: 'Mozilla/5.0 (Macintosh)' }, addEventListener() {}, removeEventListener() {},
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }), localStorage: { getItem: () => null, setItem() {} },
  location: { pathname: '/', search: '', hash: '', href: 'app://local/' }, history: { state: null, replaceState() {} } };

let server, generated, i18n, manifest;
before(async () => {
  manifest = await extractCoworkSessionStates({ check: true, version: V4 });
  server = await createServer({ configFile: false, root: ROOT, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  i18n = await server.ssrLoadModule('/electron/i18n/index.mjs');
  i18n.setLocale('en-US');
  generated = await server.ssrLoadModule('/src/generated/cowork-session-states-v4/index.mjs');
});
after(() => { i18n?.setLocale('en-US'); return server?.close(); });

test('two source contracts: 3.6556.2 production (unchanged) and the 4.16336.0 isolated graph, both --check', async () => {
  assert.deepEqual(contractVersions, ['3.6556.2', V4]);
  const legacy = await extractCoworkSessionStates({ check: true });
  assert.equal(legacy.referenceVersion, '3.6556.2');
  assert.equal(legacy.sharedGraph, undefined);
  assert.equal(manifest.referenceVersion, V4);
  assert.equal(manifest.referenceSnapshot, 'snapshots/claude-4.16336.0-20261104');
  assert.equal(manifest.sharedGraph, 'cds-core');
  assert.equal(manifest.dependencyGraph, 'routines-shared-v4');
  assert.deepEqual(manifest.isolatedGraph, { productionOutput: 'src/generated/cowork-session-states', productionSwitchNotBeforeBatch: 6, heldBy: ['session-rail'] });
  assert.deepEqual([...legacyConsumers], ['session-rail']);
  assert.deepEqual((await fs.readdir(OUT)).sort(), [...manifest.modules.map(m => m.target), 'index.mjs', 'manifest.json'].sort());
  for (const m of manifest.modules) {
    assert.equal(m.referenceVersion, V4, m.target);
    const bytes = await fs.readFile(path.join(OUT, m.target));
    assert.equal(sha(bytes), m.sha256, m.target);
    assert.match(bytes.toString(), /^\/\/ Original Claude Desktop 4\.16336\.0 bindings from /, m.target);
    assert.doesNotMatch(bytes.toString(), /\.\.\/view-tabs\/|\.\.\/routines-shared\/|\.\.\/cowork-scheduled\/|3\.6556\.2/, m.target);
    assert.equal(sha(await fs.readFile(path.join(official4.ionSource, m.source))), m.sourceSha256, m.target);
  }
  assert.deepEqual(manifest.publicNames, { CoworkSessionEndedNotice: { file: C21, local: 'SN' }, coworkEndedReason: { file: C21, local: 'xN' } });
  assert.deepEqual(manifest.adapters, [{ original: 'shared-123-1Hc1RTKl.js#h_', name: 'useNewTaskHref' }]);
  assert.deepEqual(manifest.sharedAdapters.map(a => a.name).sort(), ['FormattedMessage', 'useErrors', 'useIntl', 'usePathname']);
});

// round3 integrate-gates (derivation of round3/legacy-prep.json "linker-whitelists"): `linking === []` was a staging-time
// snapshot. Under D1 later 4.16336.0 regions that share a binding this graph holds (session-rail-v4 c0b46114c links
// shared-3 jp) link it through manifest.linkedAreas. The isolation it guards, derived from the manifests (stricter than the
// file-name check): no host file names the folder; every generated linker is a 4.16336.0 graph that declares
// cowork-session-states-v4 in linkedAreas and names it only through manifest imports of kind 'linked'.
test('the production graph and session-rail are untouched: no host file links the -v4 graph; only 4.16336.0 graphs link it, each by a D1 declaration', async () => {
  const legacy = JSON.parse(await fs.readFile(path.join(LEGACY, 'manifest.json'), 'utf8'));
  assert.equal(legacy.referenceVersion, '3.6556.2');
  for (const m of legacy.modules) assert.equal(sha(await fs.readFile(path.join(LEGACY, m.target))), m.sha256, m.target);
  const band = await fs.readFile(path.join(ROOT, 'src/generated/session-rail/band-frame.mjs'), 'utf8');
  assert.match(band, /import \{ B5 as l \} from "\.\.\/cowork-session-states\/shared-2-TF8v67kg\.mjs";/);
  const linking = [];
  const walk = async dir => {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) { if (file !== OUT && entry.name !== 'node_modules') await walk(file); continue; }
      if (/\.(?:m?js|jsx)$/.test(entry.name) && (await fs.readFile(file, 'utf8')).includes('cowork-session-states-v4/')) linking.push(path.relative(ROOT, file));
    }
  };
  await walk(path.join(ROOT, 'src'));
  const GENERATED = path.join(ROOT, 'src/generated');
  const inGenerated = file => !path.relative(GENERATED, path.join(ROOT, file)).startsWith('..');
  assert.deepEqual(linking.filter(file => !inGenerated(file)), [], 'no host file names cowork-session-states-v4/');
  const linkedNames = m => { const la = m?.linkedAreas; return !la ? [] : Array.isArray(la) ? la.map(e => typeof e === 'string' ? e : e.area) : Object.keys(la); };
  const byArea = new Map();
  for (const file of linking.filter(inGenerated)) {
    const area = path.relative(GENERATED, path.join(ROOT, file)).split(path.sep)[0];
    byArea.set(area, [...(byArea.get(area) ?? []), path.basename(file)]);
  }
  for (const [area, files] of byArea) {
    const m = JSON.parse(await fs.readFile(path.join(GENERATED, area, 'manifest.json'), 'utf8'));
    assert.equal(m.referenceVersion, V4, `${area} is a 4.16336.0 graph`);
    assert.ok(linkedNames(m).includes('cowork-session-states-v4'), `${area} declares cowork-session-states-v4 in linkedAreas`);
    const targets = new Set();
    for (const mod of m.modules) for (const i of mod.imports ?? [])
      if (/^\.\.\/cowork-session-states-v4\//.test(i.from ?? '')) { assert.equal(i.kind, 'linked', `${area}/${mod.target} -> ${i.from}`); targets.add(mod.target); }
    for (const name of files) assert.ok(targets.has(name), `${area}/${name} names cowork-session-states-v4 only through a manifest 'linked' import`);
  }
});

test('roots: SN and xN are the only declarations of the 4.16336.0 chunk carrying their features (chunk-internal)', async () => {
  const c21 = await official(C21);
  assert.equal(c21.split('"data-testid":"cowork-session-ended-notice"').length - 1, 1);
  assert.ok(c21.includes('function xN(e,t){return e==="read_only"?t?"read_only":"failed":e}'));
  assert.ok(!/export\{[^}]*\bSN as\b/.test(c21) && !/export\{[^}]*\bxN as\b/.test(c21));
  // A feature that is not in the 4.16336.0 text (the 3.6556.2 "New task" id) stops generation.
  const stale = structuredClone(contracts[V4].roots);
  stale[C21].SN.features = [...stale[C21].SN.features, 'defaultMessage: "New task", id: "K4O03zh0vo"'];
  await assert.rejects(extractCoworkSessionStates({ check: true, contract: { ...contracts[V4], roots: stale } }), /lacks "defaultMessage: \\"New task\\", id: \\"K4O03zh0vo\\""/);
  // A feature set that does not single out the root stops generation (unique-root rule).
  const vague = structuredClone(contracts[V4].roots);
  vague[C21].xN.features = ['return e'];
  await assert.rejects(extractCoworkSessionStates({ check: true, contract: { ...contracts[V4], roots: vague } }), /is not the unique declaration/);
  // A contract variant never writes.
  await assert.rejects(extractCoworkSessionStates({ contract: contracts[V4] }), /check: true only/);
});

test('links: CdsButton from cds-core and FI from routines-shared-v4 by hash; defineMessages re-cut as cds-core holds it; pinned module bytes are current', async () => {
  const core = JSON.parse(await fs.readFile(path.join(ROOT, 'src/generated/cds-core/manifest.json'), 'utf8'));
  const dep = JSON.parse(await fs.readFile(path.join(ROOT, 'src/generated/routines-shared-v4/manifest.json'), 'utf8'));
  const coreHeld = new Map(core.modules.flatMap(m => m.bindings.map(b => [`${path.basename(m.source)}#${b.name ?? b}`, b.sha256])));
  const depHeld = new Map(dep.modules.flatMap(m => m.bindings.map(b => [`${m.source}#${b.name}`, b.sha256])));
  const imports = manifest.modules.flatMap(m => m.imports);
  const shared = imports.filter(i => i.kind === 'shared-graph');
  assert.deepEqual(shared.map(i => [i.name, i.via]), [['CdsButton', 'shared-frame-CJdE5Ria.js#Xu']]);
  for (const i of shared) assert.equal(i.linkedSha256, coreHeld.get(i.via));
  const fromDep = imports.filter(i => i.kind === 'routines-shared');
  assert.deepEqual(fromDep.map(i => i.via).sort(), ['shared-62-DoCqVpIq.js#FI']);
  for (const i of fromDep) { assert.match(i.from, /^\.\.\/routines-shared-v4\//); assert.equal(i.linkedSha256, depHeld.get(i.via), i.via); }
  // Since cds-core wave 5 (applied together with wave 5b) cds-core holds vendor-intl tn (defineMessages, pure, without a
  // publicName): the routines-shared-v4 copy can no longer be linked ("cds-core holds it"), so it is re-cut here as the
  // same declaration cds-core holds.
  const intl = manifest.modules.find(m => m.source === 'vendor-intl-BJgYK7RA.js');
  assert.deepEqual([intl.bindings.map(b => b.name), intl.heldByCdsCore], [['tn'], ['tn']]);
  assert.equal(intl.bindings[0].sha256, coreHeld.get('vendor-intl-BJgYK7RA.js#tn'));
  assert.equal(Object.values(core.publicNames).some(e => e.file === 'vendor-intl-BJgYK7RA.js' && e.local === 'tn'), false, 'cds-core publishes tn: link it');
  assert.deepEqual(imports.filter(i => i.via === 'vendor-intl-BJgYK7RA.js#tn').map(i => [i.kind, i.from]), [['generated', './vendor-intl-BJgYK7RA.mjs']]);
  for (const [target, hash] of Object.entries(manifest.sharedGraphModules)) assert.equal(sha(await fs.readFile(path.join(ROOT, 'src/generated/cds-core', target))), hash, target);
  for (const [target, hash] of Object.entries(manifest.linkedGraphModules)) assert.equal(sha(await fs.readFile(path.join(ROOT, 'src/generated', target))), hash, target);
  // The React Compiler helpers cds-core holds without a publicName are re-cut by hash (pure), nothing stateful from it.
  const frame = manifest.modules.find(m => m.source === official4.sharedFrame);
  assert.deepEqual(frame.heldByCdsCore, frame.bindings.map(b => b.name).sort());
  for (const b of frame.bindings) assert.equal(b.sha256, coreHeld.get(`${official4.sharedFrame}#${b.name}`), b.name);
  assert.deepEqual(manifest.contexts, []);
});

test('D1: shared-123 wY (cowork-scheduled shared-104 dP in 3.6556.2) is re-cut, also by cowork-scheduled-v4 (pure); the drop guard counter rw is reported as d1Pending', async () => {
  const s123 = manifest.modules.find(m => m.source === 'shared-123-1Hc1RTKl.js');
  assert.deepEqual(s123.bindings.map(b => b.name), ['SY', 'wY']);
  const survey = await extractCoworkSessionStates({ survey: true, version: V4 });
  assert.deepEqual(survey.problems, []);
  assert.deepEqual(survey.stateConflicts, []);
  // Since wave 5b writes cowork-scheduled-v4 it cuts the same two pure declarations (a string constant and its reader).
  // Since round 3 frame-sidebar-nav (the 4.16336.0 sidebar nav body) also cuts those two and six shared-18 declarations
  // this graph cuts; the survey reports no state conflict for any of them and d1-gate (both modes) finds no stateful
  // duplicate among them (round3/integrate-gates), so every overlap is a pure re-cut.
  const nav18 = ['BQ', 'LQ', 'dq', 'uq', 'IQ', 'zQ'].map(name => ({ binding: `shared-18-Cfqwgjc5.js#${name}`, areas: ['frame-sidebar-nav'] }));
  assert.deepEqual(survey.d1, [...nav18, { binding: 'shared-123-1Hc1RTKl.js#wY', areas: ['cowork-scheduled-v4', 'frame-sidebar-nav'] }, { binding: 'shared-123-1Hc1RTKl.js#SY', areas: ['cowork-scheduled-v4', 'frame-sidebar-nav'] }]);
  const cs = JSON.parse(await fs.readFile(path.join(ROOT, 'src/generated/cowork-scheduled-v4/manifest.json'), 'utf8'));
  const cs123 = new Map(cs.modules.filter(m => m.source === 'shared-123-1Hc1RTKl.js').flatMap(m => m.bindings.map(b => [b.name, b.sha256])));
  for (const b of s123.bindings) assert.equal(cs123.get(b.name), b.sha256, `cowork-scheduled-v4 cuts ${b.name} as the same declaration`);
  assert.deepEqual(survey.d1Pending, [{ binding: 'shared-8-BqfCbkJd.js#rw', kind: 'module-level binding written after its declaration', areas: [] }]);
});

test('fail-stop D46: module state cds-core holds without a publicName stops generation with binding, text and chain', async () => {
  const core = JSON.parse(await fs.readFile(path.join(ROOT, 'src/generated/cds-core/manifest.json'), 'utf8'));
  const published = new Set(Object.values(core.publicNames).map(e => `${e.file}#${e.local}`));
  const frame = core.modules.find(m => m.target === 'shared-frame.mjs');
  assert.ok(frame.bindings.some(b => b.name === 'Fc'), 'cds-core holds Fc');
  if (published.has(`${official4.sharedFrame}#Fc`)) return; // named by a later wave: nothing left to refuse here
  const contract = { ...contracts[V4], uniqueRoots: false, adapters: {}, rawCallSites: [],
    roots: { [official4.sharedFrame]: { Fc: { name: 'probeWeakSet', features: ['Fc = new WeakSet'] } } } };
  const error = await extractCoworkSessionStates({ check: true, contract }).then(() => null, e => e);
  assert.ok(error, 'generation stops');
  assert.match(error.message, /D46/);
  assert.deepEqual(error.stateConflicts.map(c => [c.binding, c.kind, c.heldBy]), [[`${official4.sharedFrame}#Fc`, 'module WeakSet', 'cds-core/shared-frame.mjs']]);
  assert.ok(error.stateConflicts[0].text.length > 0);
});

test('call sites: the composer stand-in, the archived restore and the read-only reason are pinned in the 4.16336.0 text', async () => {
  assert.deepEqual(manifest.callSites.map(c => c.source), ['ca2ef848d-DA54buzo.js', C21, C21]);
  for (const site of manifest.callSites) assert.equal(sha(await fs.readFile(path.join(official4.ionSource, site.source))), site.sourceSha256);
  const c21 = await official(C21);
  assert.ok(c21.includes('Oa==="archived"&&zo&&mc(Z)?async()=>{try{await zo(Z)}catch(e){let t=e;throw Gs(Z),t}Fc.getState().patchSession(Z,{endedReason:void 0,isArchived:!1})}'));
  assert.ok(c21.includes('p(SN,{reason:Oa,onRestore:e},Z)'));
});

test('archived with a restore: the 4.16336.0 notice, Unarchive task (primary) and New task (secondary, host href)', () => {
  const html = renderToStaticMarkup(h(generated.CoworkSessionEndedNotice, { reason: 'archived', onRestore: async () => {} }));
  assert.match(html, /^<div data-testid="cowork-session-ended-notice" data-composer-stand-in=""/);
  assert.ok(html.includes(`class="${NOTICE_CLASS}"`));
  assert.equal(text(html), 'This task is archived It can’t take new messages while archived. Unarchive it to keep working here, or start a new task. Unarchive task New task');
  assert.match(html, /<button type="button" data-cds="Button"(?:(?!<\/button>).)* bg-fill-primary (?:(?!<\/button>).)*Unarchive task<\/span><\/button>/);
  assert.match(html, /<a data-cds="Button"[^>]* href="\/new\?surface=cowork">(?:(?!<\/a>).)* bg-fill-secondary (?:(?!<\/a>).)*New task<\/span><\/a>/);
});

test('ended and org / role off: the official texts; read-only reasons have no buttons', () => {
  assert.equal(text(renderToStaticMarkup(h(generated.CoworkSessionEndedNotice, { reason: 'failed' }))), 'This task has ended It can’t take new messages any more. Start a new task to continue. New task');
  assert.equal(text(renderToStaticMarkup(h(generated.CoworkSessionEndedNotice, { reason: 'archived' }))), 'This task is archived It can’t take new messages any more. Start a new task to continue. New task');
  const cases = {
    cowork_off: 'Cowork is turned off for your organization. Ask your admin to turn it back on.',
    cowork_off_role: 'Cowork is turned off for your role. Ask your admin if you need it back.',
    cowork_cloud_off_role: 'Cowork in the cloud is turned off for your role. Ask your admin if you need it back.',
    hub_off_role: 'This task needs a feature that’s turned off for your role. Ask your admin if you need it back.',
  };
  for (const [reason, body] of Object.entries(cases)) {
    const html = renderToStaticMarkup(h(generated.CoworkSessionEndedNotice, { reason }));
    assert.equal(text(html), `This task is read-only ${body}`, reason);
    assert.doesNotMatch(html, /<button|<a /, reason);
  }
  assert.equal(generated.coworkEndedReason('read_only', false), 'failed');
  assert.equal(generated.coworkEndedReason('read_only', true), 'read_only');
  assert.equal(generated.coworkEndedReason('archived', false), 'archived');
});

test('read_only (new in 4.16336.0): the gated messages and the upgrade link over the current pathname, no New task', () => {
  const html = renderToStaticMarkup(h(generated.CoworkSessionEndedNotice, { reason: 'read_only' }));
  assert.match(html, /<a data-cds="Button"[^>]* href="\/upgrade\?feature=cowork&amp;hide_free=true&amp;returnTo=[^"]*"/);
  assert.doesNotMatch(html, /New task|Unarchive task/);
});

test('zh-CN: the notice reads the host catalogue for the 4.16336.0 ids', () => {
  i18n.setLocale('zh-CN');
  try {
    const html = renderToStaticMarkup(h(generated.CoworkSessionEndedNotice, { reason: 'archived', onRestore: async () => {} }));
    assert.match(text(html), /^此任务已归档 /);
    assert.ok(text(html).includes('取消归档任务'));
    assert.ok(text(html).endsWith('新建任务'));
  } finally { i18n.setLocale('en-US'); }
});
