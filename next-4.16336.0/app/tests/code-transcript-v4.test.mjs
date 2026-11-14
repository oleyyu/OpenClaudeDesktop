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
import { extractCodeTranscriptV4, ROOTS, ROOT_PINS, STEPS, FOREIGN_OWNERS, PENDING_ROOTS, PENDING_CALL_SITES, CDS_CORE_MANIFEST_SHA256,
  CALL_SITES, CALL_SITE_PINS, DYNAMIC_IMPORTS, PENDING_LINKED_AREAS, CDS_CORE_WRITER_NEEDS, LINK_PLAN, LINK_AT_SLICE, LINK_REQUEST_FILES }
  from '../scripts/extract-code-transcript-v4.mjs';

// Round 2, region code-transcript, unit code-transcript:a — steps ct-0 (preconditions, owners, the 7 roots region-plan's
// locate pass left ambiguous) + ct-1 (the c856385e2 provider family and the small contexts): the 4.16336.0 graph
// (scripts/extract-code-transcript-v4.mjs -> src/generated/code-transcript-v4), staged next to the 3.6556.2
// src/generated/code-transcript the host still renders. Source only: manifest, --check, the official chunk text, the
// owner table, the pending roots left for :b, and the contexts loaded through Vite SSR.
const app = path.resolve(import.meta.dirname, '..');
const snapshots = path.resolve(app, '../reference/snapshots');
const ion = path.join(snapshots, 'claude-4.16336.0-20261104/ion-dist/assets/v1');
const ionBefore = path.join(snapshots, 'claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
const local = rel => fs.readFileSync(path.join(app, rel));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const h = React.createElement;
const out = 'src/generated/code-transcript-v4';
const manifest = JSON.parse(local(`${out}/manifest.json`));
const provenance = JSON.parse(local(`${out}/provenance.json`));
const owners = JSON.parse(local(`${out}/owners.json`));
const official = name => fs.readFileSync(path.join(ion, name), 'utf8');
const previous = name => fs.readFileSync(path.join(ionBefore, name), 'utf8');

let server, gen, cdsPaths;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  gen = await server.ssrLoadModule(`/${out}/index.mjs`);
  cdsPaths = await server.ssrLoadModule('/src/generated/cds-core/c856385e2.mjs');
});
after(async () => { await closeWhenSettled(server); await server.close(); });

test('manifest: 4.16336.0 snapshot, cds-core shared graph, module hashes, no host adapter; --check', async () => {
  assert.equal(manifest.referenceVersion, '4.16336.0');
  assert.equal(manifest.referenceSnapshot, 'snapshots/claude-4.16336.0-20261104');
  assert.equal(manifest.generator, 'scripts/extract-code-transcript-v4.mjs');
  assert.equal(manifest.sharedGraph, 'cds-core');
  assert.deepEqual(STEPS, ['ct-0', 'ct-1']);
  assert.deepEqual(provenance.steps, STEPS);
  assert.equal(provenance.previous.referenceVersion, '3.6556.2');
  assert.equal(provenance.sharedGraph.manifestSha256, CDS_CORE_MANIFEST_SHA256);
  assert.equal(sha(local('src/generated/cds-core/manifest.json')), CDS_CORE_MANIFEST_SHA256);
  assert.deepEqual(manifest.modules.map(m => m.target).sort(), ['background-tasks.mjs', 'session-providers.mjs', 'transcript-rows-chrome.mjs']);
  for (const mod of manifest.modules) {
    assert.equal(mod.referenceVersion, '4.16336.0', mod.target);
    assert.equal(mod.sourceSha256, sha(fs.readFileSync(path.join(ion, mod.source))), mod.source);
    assert.equal(mod.sha256, sha(local(`${out}/${mod.target}`)), mod.target);
    for (const imp of mod.imports) assert.notEqual(imp.kind, 'adapter', `${mod.target} imports a host adapter`);
  }
  await extractCodeTranscriptV4({ check: true });
});

test('ct-0/ct-1 roots: semantic names, AST-located through their callers, pinned', () => {
  const roots = new Map(provenance.roots.map(r => [`${r.file}#${r.local}`, r]));
  assert.equal(roots.size, 9);
  for (const [file, rs] of Object.entries(ROOTS)) for (const [name, spec] of Object.entries(rs)) {
    const r = roots.get(`${file}#${name}`);
    assert.ok(r, `${file}#${name}`);
    assert.equal(r.name, spec.name);
    assert.equal(r.pinned, true);
    assert.equal(r.declarationSha256, ROOT_PINS[`${file}#${name}`]);
    assert.equal(r.sliced, spec.slice !== false);
  }
  // c856385e2: 17 `X.Provider` declarations; the session provider stack c5259f582 mounts these three with its props.
  for (const k of ['At', 'Yt', 'Qt']) assert.equal(roots.get(`c856385e2-Cqx37C-b.js#${k}`).shapeAlternatives, 17);
  const stack = official('c5259f582-BaPt7VSi.js');
  assert.ok(stack.includes('S as ne') && stack.includes('n(ne,{value:t.sessionFileReadable,children:D})'));
  assert.ok(stack.includes('h as de') && stack.includes('n(de,{value:t.imageLoader,children:x})'));
  assert.ok(stack.includes('n as pe') && stack.includes('n(pe,{value:t.containedImageLoader,children:S})'));
  const paths = official('c856385e2-Cqx37C-b.js');
  assert.ok(paths.includes('At=kt.Provider') && paths.includes('Yt=Jt.Provider') && paths.includes('Qt=Zt.Provider'));
  // 3.6556.2: the same three props, other locals (rt / xt / wt), the same context shapes.
  const stackBefore = previous('c5259f582-Drp5wXDV.js');
  assert.ok(stackBefore.includes('e(u,{value:n.sessionFileReadable,') && stackBefore.includes('e(h,{value:n.imageLoader,') && stackBefore.includes('e(g,{value:n.containedImageLoader,'));
  const pathsBefore = previous('c856385e2-aEyDzrcK.js');
  assert.ok(pathsBefore.includes('nt=s(!1)') && pathsBefore.includes('rt=nt.Provider') && pathsBefore.includes('xt=bt.Provider') && pathsBefore.includes('wt=Ct.Provider'));
  // cea7057eb: X is the task array ve provides outermost (K / J, the task-id sets, share the `t(<ident>)` shape).
  const tasks = official('cea7057eb-BrXukOIp.js');
  assert.ok(tasks.includes('var X=t(E)') && tasks.includes('K=t(G)') && tasks.includes('J=t(q)'));
  assert.ok(tasks.includes('a=i.tasks,') && tasks.includes('n(X.Provider,{value:a},n(L.Provider,{value:s}'));
  assert.ok(previous('cea7057eb-De2BQu3K.js').includes('var X=t(D)'));
  // c96d752d0: WM is the one of 14 `k(!1)` contexts the feed provides around an aside reply and the user rows read.
  assert.equal(roots.get('c96d752d0-D9VB6ArX.js#WM').shapeAlternatives, 14);
  const c96 = official('c96d752d0-D9VB6ArX.js');
  assert.ok(c96.includes('f(WM.Provider,{value:t.entry.aside===!0&&'));
  assert.ok(c96.includes('"comment-summon-skeleton"') && c96.includes('m=j(WM)'));
  assert.ok(previous('c96d752d0-CWv_7-n9.js').includes('f(uD.Provider,{value:t.entry.aside===!0&&'));
  // Fork rows: located through the feed's row switch, pinned, sliced by ct-2.
  assert.ok(c96.includes('f(jgt,{sessionId:e,parentSessionId:t.parentSessionId,linked:n})') && c96.includes('var jgt=w(Agt)'));
  assert.ok(c96.includes('f(Ngt,{childIds:t.childIds,linked:e})') && c96.includes('var Ngt=w(Mgt)'));
  assert.equal(roots.get('c96d752d0-D9VB6ArX.js#jgt').sliced, false);
  assert.equal(roots.get('c96d752d0-D9VB6ArX.js#Ngt').sliced, false);
});

test('ct-0 owner table: owned state sliced only here, foreign owners verified, transcript-rows-v4 / r3b-transcript-v4 linked', () => {
  assert.deepEqual(owners.owned.map(o => o.name).sort(),
    ['BackgroundTasksContext', 'ContainedImageLoaderProvider', 'ImageLoaderProvider', 'SessionFileReadableProvider', 'UserRowChromeContext']);
  for (const o of owners.owned) assert.equal(o.owner, 'code-transcript-v4');
  assert.deepEqual(owners.foreign.map(o => o.name), FOREIGN_OWNERS.map(o => o.name));
  const cds = JSON.parse(local('src/generated/cds-core/manifest.json'));
  for (const name of ['CdsOwnerWindowContext', 'CdsSkeletonStartedAtContext', 'CdsNaturalImageTilesContext', 'ctx_c856385e2_kt', 'ctx_c856385e2_Jt', 'ctx_c856385e2_Zt'])
    assert.ok(cds.publicNames[name], name);
  const rows = JSON.parse(local('src/generated/transcript-rows-v4/owners.json'));
  for (const name of ['BackgroundTaskStatusContext', 'SessionScopeContext', 'PathResolverProvider'])
    assert.ok(rows.owned.some(o => o.name === name && o.owner === 'transcript-rows-v4'), name);
  assert.deepEqual(manifest.linkedAreas.map(a => a.area ?? a).sort(), ['chat-markdown-v4', 'chat-renderer-v4', 'code-composer-v4', 'code-routines-v4', 'cowork-approval-v4',
    'cowork-progress-v4', 'files-changes-v4', 'r3b-transcript-v4', 'routines-shared-v4', 'session-rail-kit-v4', 'session-rail-sections-v4', 'sessions-page-v4',
    'transcript-rows-v4', 'turn-plan-v4', 'working-line-v4']);
  const providers = manifest.modules.find(m => m.target === 'session-providers.mjs');
  assert.deepEqual(providers.bindings.map(b => b.name).sort(), ['At', 'Qt', 'Yt']);
  for (const ctx of ['kt', 'Jt', 'Zt']) assert.ok(providers.imports.some(i => i.local === ctx && i.kind === 'shared-graph' && i.from === '../cds-core/c856385e2.mjs'), ctx);
  for (const dir of fs.readdirSync(path.join(app, 'src/generated'))) {
    if (dir === 'code-transcript-v4') continue;
    const file = path.join(app, 'src/generated', dir, 'manifest.json');
    if (!fs.existsSync(file)) continue;
    const m = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (m.referenceVersion !== '4.16336.0') continue;
    for (const mod of manifest.modules) for (const b of mod.bindings) {
      assert.ok(!(m.modules ?? []).some(x => path.basename(x.source ?? '') === mod.source && (x.bindings ?? []).some(y => (y.name ?? y) === b.name)), `${dir} slices ${mod.source}#${b.name}`);
    }
  }
});

test('PENDING_ROOTS for code-transcript:b: every 3.6556.2 root not handled here, candidates still top-level declarations', () => {
  const pending = provenance.pendingRoots;
  assert.equal(pending.length, PENDING_ROOTS.length + PENDING_CALL_SITES.length);
  for (const p of pending) {
    assert.ok(['ct-2', 'ct-4'].includes(p.step), p.name);
    assert.ok(fs.existsSync(path.join(ionBefore, p.previous.split('#')[0])), p.previous);
    assert.equal(p.structure, p.candidate === null ? 'unsurveyed' : 'top-level-declaration', p.name);
  }
  const names = new Set(pending.map(p => p.name));
  // code-transcript:b pinned the four call sites (next test); the renderer roots stay pending for slicing.
  for (const n of ['CodeTranscriptRenderer', 'RendererTurnRow', 'ForkedFromRow', 'ForkMarkerRow']) assert.ok(names.has(n), n);
  assert.deepEqual(PENDING_CALL_SITES, []);
  for (const n of ['callSite:uw', 'callSite:dw', 'callSite:bat', 'callSite:Zit']) assert.ok(!names.has(n), `${n} is pinned, not pending`);
  const handled = new Set(Object.values(ROOTS).flatMap(rs => Object.values(rs).filter(r => r.slice !== false).map(r => r.name)));
  for (const n of handled) assert.ok(!names.has(n), `${n} is both sliced and pending`);
});

test('ct-2 (code-transcript:b): V8 / f8 located and pinned, not sliced; the four call sites pinned; chat-renderer-v4 linked', () => {
  const roots = new Map(provenance.roots.map(r => [`${r.file}#${r.local}`, r]));
  const v8 = roots.get('c96d752d0-D9VB6ArX.js#V8'), f8 = roots.get('c96d752d0-D9VB6ArX.js#f8');
  assert.equal(v8.name, 'CodeTranscriptRenderer'); assert.equal(v8.sliced, false); assert.equal(v8.previous, 'c96d752d0-CWv_7-n9.js#R3');
  assert.equal(f8.name, 'RendererTurnRow'); assert.equal(f8.sliced, false); assert.equal(f8.previous, 'c96d752d0-CWv_7-n9.js#l3');
  for (const m of manifest.modules) for (const b of m.bindings) assert.ok(!['V8', 'f8'].includes(b.name) || m.source !== 'c96d752d0-D9VB6ArX.js', `${b.name} is sliced`);
  const c96 = official('c96d752d0-D9VB6ArX.js'), before96 = previous('c96d752d0-CWv_7-n9.js');
  // The chunk's namespace names V8 (3.6556.2: R3), WSt draws it as USt (3.6556.2: Zit / Xit = R3), f8 reads d8.
  assert.equal(c96.split('CodeTranscriptRenderer:()=>').length - 1, 1);
  assert.ok(c96.includes('CodeTranscriptRenderer:()=>V8') && before96.includes('CodeTranscriptRenderer:()=>R3'));
  assert.ok(c96.includes('var USt=V8;') && before96.includes('var Xit=R3;'));
  assert.ok(c96.includes('d8=k(null)') && c96.includes('r=j(d8);'));
  // Call sites: the one declaration carrying the features, pinned, emitted as runSlicer callSites.
  assert.deepEqual(provenance.callSites.map(c => `${c.file}#${c.local}`), CALL_SITES.map(c => `${c.source}#${c.binding}`));
  assert.deepEqual(CALL_SITES.map(c => c.previous), ['cf74bc599-CRYqipWN.js#uw', 'cf74bc599-CRYqipWN.js#dw', 'c96d752d0-CWv_7-n9.js#bat', 'c96d752d0-CWv_7-n9.js#Zit']);
  for (const c of provenance.callSites) assert.equal(c.declarationSha256, CALL_SITE_PINS[`${c.file}#${c.local}`]);
  const pinned = manifest.callSites.filter(c => c.binding);
  assert.deepEqual(pinned.map(c => `${c.source}#${c.binding}`), CALL_SITES.map(c => `${c.source}#${c.binding}`));
  for (const c of pinned) assert.equal(c.sourceSha256, sha(fs.readFileSync(path.join(ion, c.source))));
  const cf7 = official('cf74bc599-BytvntCE.js');
  assert.ok(cf7.includes('{offered:E,liveTextHeld:T}') && cf7.includes('liveSnapshot:ot,children:ft'));
  assert.ok(c96.includes('componentName:"TranscriptRenderer"') && c96.includes('f(USt,{...t,streaming:i})'));
  // The renderer's pending owners and cds-core writer needs are recorded (not sliced here).
  assert.deepEqual(provenance.pendingLinkedAreas.map(a => a.area), PENDING_LINKED_AREAS.map(a => a.area));
  assert.equal(CDS_CORE_WRITER_NEEDS.length, 40);
  assert.equal(new Set(CDS_CORE_WRITER_NEEDS).size, 40);
  assert.deepEqual(provenance.cdsCoreWriterNeeds, CDS_CORE_WRITER_NEEDS);
  const cds = JSON.parse(local('src/generated/cds-core/manifest.json'));
  const published = new Set(Object.values(cds.publicNames).map(v => `${v.file}#${v.local}`));
  // Wave 7 publishes exactly one of the 40 (vendor-zod k, writer_vendorzod_k, with the whole vendor-zod state unit, W7-D2);
  // the other 39 and the two pending owner graphs still hold the renderer. Any further publication stops this test, so
  // the hold is reviewed.
  // W8S-T2 review (round-4 settings addendum, wave 8s): cds-core publishes one more, shared-0 g9 (settings_shared0_g9); the other
  // 38 and the two pending owner graphs still hold the renderer, so it stays held.
  // Was: deepEqual(..., ['vendor-zod-fszujTq6.js#k']) and the loop over every need but k.
  const publishedNeeds = ['shared-0-CnnWnVrT.js#g9', 'vendor-zod-fszujTq6.js#k'];
  assert.deepEqual(CDS_CORE_WRITER_NEEDS.filter(w => published.has(w)), publishedNeeds);
  for (const w of CDS_CORE_WRITER_NEEDS.filter(w => !publishedNeeds.includes(w))) assert.ok(!published.has(w), `${w} is published by cds-core now: slice the renderer`);
});

test('ct-4 (code-transcript:b): every import() of c96d752d0 is a string literal, holders pinned, none sliced here', () => {
  const c96 = official('c96d752d0-D9VB6ArX.js');
  const table = DYNAMIC_IMPORTS['c96d752d0-D9VB6ArX.js'];
  assert.equal(table.length, 7);
  assert.equal(c96.split('import(').length - 1, 7);
  assert.equal([...c96.matchAll(/import\("\.\/[\w-]+\.js"\)/g)].length, 7);
  for (const r of table) assert.ok(c96.includes(`import("${r.specifier}")`), r.specifier);
  assert.deepEqual(provenance.dynamicImports.map(r => r.holder), table.map(r => r.holder));
  for (const r of provenance.dynamicImports) assert.equal(r.computed, false);
  const mod = manifest.modules.find(m => m.source === 'c96d752d0-D9VB6ArX.js');
  for (const r of table) assert.ok(!mod.bindings.some(b => b.name === r.holder), r.holder);
  assert.ok(fs.existsSync(path.join(ion, 'c9f414608-CCeBXbMm.js')));
});

test('SSR: the providers feed cds-core\'s one context each; the owned contexts read their official defaults', () => {
  const Read = ({ ctx, pick }) => String(pick(React.useContext(ctx)));
  assert.equal(gen.SessionFileReadableProvider, cdsPaths.kt.Provider);
  assert.equal(gen.ImageLoaderProvider, cdsPaths.Jt.Provider);
  assert.equal(gen.ContainedImageLoaderProvider, cdsPaths.Zt.Provider);
  assert.equal(renderToStaticMarkup(h(Read, { ctx: cdsPaths.kt, pick: v => v })), 'false');
  assert.equal(renderToStaticMarkup(h(gen.SessionFileReadableProvider, { value: true }, h(Read, { ctx: cdsPaths.kt, pick: v => v }))), 'true');
  const loader = () => null;
  assert.equal(renderToStaticMarkup(h(gen.ImageLoaderProvider, { value: loader }, h(Read, { ctx: cdsPaths.Jt, pick: v => v === loader }))), 'true');
  assert.equal(renderToStaticMarkup(h(gen.ContainedImageLoaderProvider, { value: loader }, h(Read, { ctx: cdsPaths.Zt, pick: v => v === loader }))), 'true');
  assert.equal(renderToStaticMarkup(h(Read, { ctx: cdsPaths.Zt, pick: v => v })), 'null');
  assert.equal(renderToStaticMarkup(h(Read, { ctx: gen.BackgroundTasksContext, pick: v => Array.isArray(v) && v.length })), '0');
  const tasks = [{ taskId: 't1', toolUseId: 'toolu_1' }];
  assert.equal(renderToStaticMarkup(h(gen.BackgroundTasksContext.Provider, { value: tasks },
    h(Read, { ctx: gen.BackgroundTasksContext, pick: v => v.find(t => t.toolUseId === 'toolu_1')?.taskId }))), 't1');
  assert.equal(renderToStaticMarkup(h(Read, { ctx: gen.UserRowChromeContext, pick: v => v })), 'false');
  assert.equal(renderToStaticMarkup(h(gen.UserRowChromeContext.Provider, { value: true }, h(Read, { ctx: gen.UserRowChromeContext, pick: v => v }))), 'true');
});

test('ct-3 (code-transcript:c): the 19 3.6556.2 dependency regions mapped to 4.16336.0 graphs; linked ones on this version; link surface', () => {
  // region-plan batches[9] code-transcript dependsOn: every region, once.
  const plan = JSON.parse(fs.readFileSync(path.join(app, '../analysis/claude-4.16336.0-migrate-20261104/region-plan/plan.json'), 'utf8'));
  const entry = plan.batches.flatMap(b => b.regions ?? []).find(r => r.area === 'code-transcript');
  assert.deepEqual(LINK_PLAN.map(l => l.region).sort(), entry.dependsOn.map(d => d.region).sort());
  assert.equal(LINK_PLAN.length, 19);
  const linked = manifest.linkedAreas.map(a => a.area ?? a);
  for (const l of LINK_PLAN) {
    assert.ok(['linked', 'pending', 'not-reached', 'no-graph'].includes(l.status), l.region);
    assert.equal(linked.includes(l.graph), l.status === 'linked', l.region);
    if (l.status === 'linked') assert.equal(JSON.parse(local(`src/generated/${l.graph}/manifest.json`)).referenceVersion, '4.16336.0', l.graph);
    if (l.status === 'no-graph') assert.equal(l.graph, null);
  }
  for (const a of linked) assert.ok(!LINK_AT_SLICE.includes(a), a);
  // The pending main-workflow graphs are the ones PENDING_LINKED_AREAS / LINK_PLAN name; never the 3.6556.2 directories.
  assert.deepEqual(LINK_PLAN.filter(l => l.status === 'pending').map(l => l.graph).sort(), ['session-rail-v4', 'turn-box-v4']);
  for (const a of [...linked, ...LINK_AT_SLICE]) assert.match(a, /-v4$|^(frame-sidebar|frame-sidebar-nav|settings-nav|r4e-plugin|r3b-tasks|titlebar|titlebar-frame|home-chat-cowork|chat-thinking|session-load-error)$/, a);
  assert.deepEqual(provenance.linkPlan.map(l => l.region), LINK_PLAN.map(l => l.region));
  // Link surface: semantic exports of what is sliced here, link requests from the consumers' files, pending names.
  const surface = JSON.parse(local(`${out}/link-surface.json`));
  assert.equal(surface.referenceVersion, '4.16336.0');
  assert.deepEqual(Object.keys(surface.semanticExports).sort(), Object.keys(gen).sort());
  for (const [name, s] of Object.entries(surface.semanticExports)) {
    const mod = manifest.modules.find(m => m.target === s.module);
    assert.equal(mod.exports[s.ref.split('#')[1]], name, name);
  }
  assert.deepEqual(LINK_REQUEST_FILES, ['queued-bar-v4-links.json', 'pierre-changes-v4-links.json']);
  for (const f of LINK_REQUEST_FILES) assert.equal(Object.hasOwn(surface.linkRequests, `scripts/${f}`), fs.existsSync(path.join(app, 'scripts', f)), f);
  for (const n of ['CodeTranscriptRenderer', 'RendererTurnRow', 'ForkedFromRow', 'ForkMarkerRow']) assert.equal(surface.pendingSemanticExports[n].located, 'pinned', n);
  assert.deepEqual(surface.linkedAreas, linked);
});

test('the 3.6556.2 graph is untouched and does not import the staged one', () => {
  const old = JSON.parse(local('src/generated/code-transcript/manifest.json'));
  assert.equal(old.referenceVersion, '3.6556.2');
  assert.equal(old.modules.length, 270);
  const src = local('scripts/extract-code-transcript.mjs').toString();
  assert.ok(!src.includes('code-transcript-v4'));
});
