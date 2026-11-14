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
import { emptyState, reduce } from '../src/state.js';
import { extractTurnBoxV4, ROOTS, LINKED_ROOTS, HOST_ADAPTERS, PENDING_ROOTS, CDS_CORE_MANIFEST_SHA256 } from '../scripts/extract-turn-box-v4.mjs';

// account2 prestage, region turn-box: the 4.16336.0 Code session turn box (scripts/extract-turn-box-v4.mjs ->
// src/generated/turn-box-v4, staged next to the 3.6556.2 src/generated/turn-box the host still renders). Source only:
// manifest, the generator's --check, the official chunk text, D1 links, and SSR of the card through Vite over the host's
// TurnBoxHost (src/source-turn-box.jsx useCodeTurnBoxHost over the real state.js reducer). No browser, no network.
const app = path.resolve(import.meta.dirname, '..');
const ion = path.resolve(app, '../reference/snapshots/claude-4.16336.0-20261104/ion-dist');
const official = name => fs.readFileSync(path.join(ion, 'assets/v1', name), 'utf8');
const local = rel => fs.readFileSync(path.join(app, rel), 'utf8');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const count = (text, needle) => text.split(needle).length - 1;
const h = React.createElement;
const out = 'src/generated/turn-box-v4';
const manifest = JSON.parse(local(`${out}/manifest.json`));
const provenance = JSON.parse(local(`${out}/provenance.json`));
const areaName = a => (typeof a === 'string' ? a : a.area);

// The names the host reads from src/generated/turn-box (3.6556.2), each served by the 4.16336.0 graph's index.
const HOST_NAMES = ['TurnBox', 'TurnNextActionsRow', 'EMPTY_TURN_TAIL', 'turnTailEqual', 'useDismissedWrapUpCalls', 'evaluateNextActionRules',
  'firingNextActionRules', 'keepShownChips', 'retireShownChips', 'chipStateKey', 'namedRuleChip', 'pullRequestRuleState', 'prStateEndsSession',
  'useIdleOnReturn', 'emptyRuleMemory', 'advanceRuleMemory', 'markRulePainted', 'markRuleUsed', 'markVerifySent', 'markSlashCorrectionUsed',
  'STREAK_RULES', 'NO_CHIPS', 'isPullRequestUrl', 'useOffersBackgroundTask', 'canHostTurnBox', 'archiveHeldBack', 'recapPlainText'];

let server, gen, M, A;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  const i18n = await server.ssrLoadModule('/electron/i18n/index.mjs');
  i18n.setLocale('en-US');
  gen = await server.ssrLoadModule(`/${out}/index.mjs`);
  M = await server.ssrLoadModule('/src/source-turn-box.jsx');
  A = await server.ssrLoadModule('/src/source-turn-box-adapters.jsx');
});
after(async () => { await closeWhenSettled(server); await server.close(); });

test('manifest: 4.16336.0 snapshot, cds-core shared graph, linked areas, chunk and module hashes; --check', async () => {
  assert.equal(manifest.referenceVersion, '4.16336.0');
  assert.equal(manifest.referenceSnapshot, 'snapshots/claude-4.16336.0-20261104');
  assert.equal(manifest.generator, 'scripts/extract-turn-box-v4.mjs');
  assert.equal(manifest.adapterModule, 'src/source-turn-box-v4-adapters.jsx');
  assert.equal(manifest.sharedGraph, 'cds-core');
  assert.equal(provenance.sharedGraph.manifestSha256, CDS_CORE_MANIFEST_SHA256);
  assert.equal(sha(fs.readFileSync(path.join(app, 'src/generated/cds-core/manifest.json'))), CDS_CORE_MANIFEST_SHA256);
  for (const a of manifest.linkedAreas)
    assert.equal(provenance.linkedAreas[areaName(a)], sha(fs.readFileSync(path.join(app, `src/generated/${areaName(a)}/manifest.json`))), areaName(a));
  // plan.json dagAdjustments: turn-box links transcript-rows-v4 (and the turn tail owner turn-plan-v4).
  for (const area of ['transcript-rows-v4', 'turn-plan-v4', 'proposal-group-v4', 'session-rail-v4']) assert.ok(manifest.linkedAreas.map(areaName).includes(area), area);
  for (const mod of manifest.modules) {
    assert.equal(mod.referenceVersion, '4.16336.0', mod.target);
    assert.equal(mod.sourceSha256, sha(fs.readFileSync(path.join(ion, 'assets/v1', mod.source))), mod.source);
    assert.equal(mod.sha256, sha(local(`${out}/${mod.target}`)), mod.target);
  }
  // The 3.6556.2 output is untouched by this generator.
  assert.equal(JSON.parse(local('src/generated/turn-box/manifest.json')).referenceVersion, '3.6556.2');
  await extractTurnBoxV4({ check: true });
});

test('roots: every host name of the 3.6556.2 graph, AST-located in 4.16336.0 and pinned, or re-exported from its owner', () => {
  assert.ok(provenance.roots.length > 0 && provenance.roots.every(r => r.pinned), 'every root declaration is pinned');
  for (const r of provenance.roots) {
    const spec = ROOTS[r.file][r.local];
    assert.ok(official(r.file).includes(spec.probe), `${r.file}#${r.local} probe`);
    if (r.export) assert.match(official(r.file), new RegExp(`\\b${r.local.replace('$', '\\$')} as ${r.export.replace('$', '\\$')}\\b`), `${r.file} export ${r.export}`);
  }
  for (const name of HOST_NAMES) assert.notEqual(gen[name], undefined, name);
  assert.deepEqual(Object.keys(gen).sort(), [...HOST_NAMES].sort());
  assert.deepEqual(PENDING_ROOTS, {});
  // The family move: TurnBox / TurnNextActionsRow are c9bd7af9c RP / kP (3.6556.2 cccc2cf0a pj / cj).
  assert.equal(ROOTS['c9bd7af9c-Bvb7EG4D.js'].RP.old, 'cccc2cf0a-DhZC33Gc.js#pj');
  assert.equal(ROOTS['c9bd7af9c-Bvb7EG4D.js'].kP.old, 'cccc2cf0a-DhZC33Gc.js#cj');
  // Linked roots come from turn-plan-v4, which holds those bindings (D1).
  for (const [key, r] of Object.entries(LINKED_ROOTS)) {
    assert.ok(provenance.linkedRoots.some(l => l.root === key && l.name === r.name), key);
    assert.ok(local(`${out}/index.mjs`).includes(`from "../${r.area}/${r.target}"`), key);
  }
});

test('host boundaries: each adapted original pinned and used; the adapter module re-exports the 3.6556.2 host adapters plus useWrapUpLeftOut', () => {
  assert.ok(provenance.adapters.every(a => a.pinned));
  assert.equal(Object.keys(HOST_ADAPTERS).length, provenance.adapters.length);
  const used = new Set(manifest.modules.flatMap(m => m.imports.filter(i => i.kind === 'adapter').map(i => `${i.via.split(/[:#]/)[0]}#${i.original}`)));
  assert.deepEqual([...used].sort(), Object.keys(HOST_ADAPTERS).sort());
  for (const m of manifest.modules) for (const i of m.imports.filter(i => i.kind === 'adapter')) assert.equal(i.from, '../../source-turn-box-v4-adapters.jsx');
  const adapterText = local('src/source-turn-box-v4-adapters.jsx');
  assert.deepEqual([...adapterText.matchAll(/^export (?:const|function|class|default) ?(\w*)/gm)].map(m => m[1]), ['useWrapUpLeftOut']);
  assert.deepEqual([...new Set([...adapterText.matchAll(/from "(\.[^"]+)"/g)].map(m => m[1]))], ['./source-turn-box-adapters.jsx']);
  assert.equal(HOST_ADAPTERS['c5da7eb42-aEqbSKbC.js#A_'].from, 'src/source-turn-box-v4-adapters.jsx');
  assert.ok(official('c5da7eb42-aEqbSKbC.js').includes('function A_(e){return ld(typeof e=="string"?e:null,E_).wrapUpLeftOut===!0}'));
});

test('D1: bindings the linked areas hold are imported, never cut again; the turn tail, chip rules and cb27dab29 B come from turn-plan-v4', () => {
  const held = new Map();
  for (const a of manifest.linkedAreas) {
    const area = areaName(a);
    const m = JSON.parse(local(`src/generated/${area}/manifest.json`));
    for (const mod of m.modules) if (typeof a === 'string' || a.modules.includes(mod.target))
      for (const b of mod.bindings ?? []) held.set(`${path.basename(mod.source)}#${typeof b === 'string' ? b : b.name}`, area);
  }
  const own = manifest.modules.flatMap(mod => mod.bindings.map(b => `${mod.source}#${b.name}`));
  assert.deepEqual(own.filter(k => held.has(k)), [], 'nothing a linked area holds is cut here');
  const tp = manifest.modules.flatMap(m => m.imports.filter(i => i.from.startsWith('../turn-plan-v4/')).map(i => `${i.from.split('/')[2]}:${i.name}`));
  for (const n of ['cd4f82e77.mjs:G', 'cd4f82e77.mjs:H', 'cd4f82e77.mjs:Nt', 'cd4f82e77.mjs:Pt', 'cd4f82e77.mjs:kt', 'cd4f82e77.mjs:q', 'plan-update.mjs:B'])
    assert.ok(tp.includes(n), n);
  const tpm = JSON.parse(local('src/generated/turn-plan-v4/manifest.json'));
  const linkExports = target => tpm.modules.find(m => m.target === target)?.linkExports ?? [];
  assert.deepEqual(linkExports('plan-update.mjs'), ['B'], 'turn-plan-v4 exports cb27dab29 B (a Set) for linking');
  assert.deepEqual(linkExports('cd4f82e77.mjs'), ['G', 'H', 'Nt', 'Pt', 'V', 'kt', 'q'], 'and the chip rules / predicates it cuts');
  // The turn tail's caches (c4ea84cb3 gr / vr: the dismissed next-row memory) are cut once, here.
  assert.ok(own.includes('c4ea84cb3-RflkeHS4.js#gr') && own.includes('c4ea84cb3-RflkeHS4.js#vr'));
  assert.ok(!own.some(k => k.startsWith('c4ea84cb3-RflkeHS4.js#Er') || k.startsWith('c4ea84cb3-RflkeHS4.js#Kr')));
});

test('the official text: the session view mount, the transcript re-exports and the presets gate are pinned raw', () => {
  assert.equal(manifest.callSites.length, 7);
  for (const site of manifest.callSites) {
    assert.equal(site.raw, true);
    assert.equal(site.sourceSha256, sha(fs.readFileSync(path.join(ion, 'assets/v1', site.source))), site.source);
    for (const f of site.features) assert.equal(count(official(site.source), f), 1, `${site.source}: ${f}`);
  }
});

// The host built over a reducer state (as tests/turn-box-mount.test.mjs builds it for the 3.6556.2 box).
const event = (method, params) => ({ kind: 'notification', method, params });
const apply = (state, method, params) => reduce(state, { event: event(method, params) });
const user = (id, turnId) => ({ id, type: 'userMessage', turnId, content: [{ type: 'text', text: id }] });
const steps = [{ step: 'Read the code', status: 'completed' }, { step: 'Fix the bug', status: 'inProgress' }, { step: 'Run the tests', status: 'pending' }];
const planCall = (id, turnId) => ({ id, type: 'mcpToolCall', server: 'code_desktop', tool: 'update_plan', turnId, status: 'completed',
  arguments: { scope: 'first_task', items: steps.map(s => ({ content: s.step, status: s.status === 'inProgress' ? 'in_progress' : s.status })) },
  result: { content: [{ type: 'text', text: `Plan shown (${steps.length} steps).` }] } });
const ref = { id: 'P', type: 'local' };
function planState() {
  let state = emptyState;
  const step = (method, params) => { state = apply(state, method, params); };
  step('turn/started', { threadId: 'P', turn: { id: 't1' } });
  step('item/completed', { threadId: 'P', turnId: 't1', item: user('u1', 't1') });
  step('turn/plan/updated', { threadId: 'P', turnId: 't1', explanation: null, plan: steps });
  step('item/completed', { threadId: 'P', turnId: 't1', item: planCall('plan-call-1', 't1') });
  return state;
}
function hostFor(state) {
  let host = null, marks = null;
  function Probe() { marks = M.useTurnBoxPlanMarks(state); host = M.useCodeTurnBoxHost({ state, planMarks: marks, currentId: 'P', requestOwner: r => r.params.threadId }); return null; }
  renderToStaticMarkup(h(Probe));
  return host;
}

test('SSR: the 4.16336.0 TurnBox renders the plan card over the host turn tail, with the next-step row beside it', () => {
  const host = hostFor(planState());
  const html = renderToStaticMarkup(h(A.TurnBoxHost.Provider, { value: host },
    h(gen.TurnBox, { sessionRef: ref, isResponding: true, latestPromptId: 'u1' }, h('p', null, 'next'))));
  for (const t of ['Read the code', 'Fix the bug', 'Run the tests']) assert.equal(count(html, t), 1, t);
  assert.equal(count(html, 'data-turn-next=""'), 1);
  assert.ok(html.includes('[&amp;:has(+[data-turn-next]_p:not([hidden]_p))]:hidden'), 'the todo card hides beside a shown next row');
  assert.equal(count(html, 'Plan from before your last message'), 0);
  // No host: the empty tail, no card.
  const bare = renderToStaticMarkup(h(gen.TurnBox, { sessionRef: ref, isResponding: false, latestPromptId: 'u1' }));
  assert.equal(count(bare, '<li'), 0);
});

test('generated pure roots: the chip rule memory and the rule table behave as the originals', () => {
  const m = gen.emptyRuleMemory('s1');
  assert.equal(m.id, 's1');
  assert.deepEqual([...gen.STREAK_RULES], ['commit', 'create_pr', 'verify']);
  assert.equal(Object.isFrozen(gen.NO_CHIPS) && gen.NO_CHIPS.length, 0);
  assert.equal(gen.prStateEndsSession('merged'), true);
  assert.equal(gen.prStateEndsSession('closed'), false);
  assert.equal(gen.isPullRequestUrl('https://github.com/o/r/pull/12'), true);
  assert.equal(gen.isPullRequestUrl('https://github.com/o/r/issues/12'), false);
  assert.equal(gen.pullRequestRuleState(undefined), 'unknown');
  assert.deepEqual(gen.evaluateNextActionRules({ isResponding: true }), gen.evaluateNextActionRules({ isResponding: true }));
  assert.equal(gen.archiveHeldBack([], 'missing'), true, 'a session the store does not hold is held back');
  assert.equal(gen.recapPlainText('x'.repeat(600)).length, 501);
});
