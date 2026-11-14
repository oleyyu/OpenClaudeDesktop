// turn-plan, 4.16336.0 staging graph (region batch 3 of the 4.16336.0 migration): scripts/extract-turn-plan-v4.mjs cuts
// the ccd_turn server and the renderer's turn tail / settled wrap-up receipt from the frozen 4.16336.0 snapshot into
// src/generated/turn-plan-v4 (main side staged under main/), linking cds-core and the 4.16336.0 areas that already hold
// shared bindings (D1). The 3.6556.2 graphs (src/generated/turn-plan, electron/generated/turn-plan) stay byte for byte:
// code-transcript, pierre-changes and queued-bar still link them by original identity. No network, no port, no process.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { parsers } from '../../tools/node_modules/prettier/plugins/babel.mjs';
import { contract, outputs, extractTurnPlanV4 } from '../scripts/extract-turn-plan-v4.mjs';
import { extractTurnPlan } from '../scripts/extract-turn-plan.mjs';
import * as official4 from '../scripts/official-4.16336.0.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const V4 = official4.referenceVersion;
let manifests, server, tail, plan, box, row;
before(async () => {
  manifests = await extractTurnPlanV4({ check: true });
  server = await createServer({ configFile: false, root: ROOT, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  tail = await server.ssrLoadModule('/src/generated/turn-plan-v4/turn-tail.mjs');
  plan = await server.ssrLoadModule('/src/generated/turn-plan-v4/plan-update.mjs');
  box = await server.ssrLoadModule('/src/generated/turn-plan-v4/settled-turn-box.mjs');
  row = await server.ssrLoadModule('/src/generated/turn-plan-v4/prompt-of-row.mjs');
});
after(() => server?.close());

test('two graphs: the 3.6556.2 production graphs still --check, the 4.16336.0 staging graph --checks separately', async () => {
  const legacy = await extractTurnPlan({ check: true });
  assert.equal(legacy.renderer.referenceVersion, '3.6556.2');
  assert.equal(legacy.main.referenceVersion, '3.6556.2');
  for (const side of ['renderer', 'main']) {
    assert.equal(manifests[side].referenceVersion, V4);
    assert.equal(manifests[side].referenceSnapshot, 'snapshots/claude-4.16336.0-20261104');
    assert.equal(manifests[side].generator, 'scripts/extract-turn-plan-v4.mjs');
    assert.deepEqual(manifests[side].isolatedGraph.heldBy, ['code-transcript', 'pierre-changes', 'queued-bar']);
    assert.equal(manifests[side].isolatedGraph.productionSwitchNotBeforeBatch, 11);
  }
  assert.equal(path.relative(ROOT, outputs.renderer), 'src/generated/turn-plan-v4');
  assert.equal(path.relative(ROOT, outputs.main), 'src/generated/turn-plan-v4/main');
  assert.equal(manifests.renderer.sharedGraph, 'cds-core');
  // The 3.6556.2 consumers still read the production graph, never the staging one.
  for (const area of ['code-transcript', 'pierre-changes', 'queued-bar']) {
    const m = JSON.parse(await fs.readFile(path.join(ROOT, 'src/generated', area, 'manifest.json'), 'utf8'));
    assert.equal(m.referenceVersion, '3.6556.2', area);
    assert.ok(!JSON.stringify(m).includes('turn-plan-v4'), area);
  }
});

test('every emitted binding is the official 4.16336.0 declaration of its chunk (source and binding hashes)', async () => {
  for (const side of ['renderer', 'main']) {
    const dir = side === 'main' ? official4.asarSource : official4.ionSource;
    for (const m of manifests[side].modules) {
      const bytes = await fs.readFile(path.join(dir, m.source));
      assert.equal(sha(bytes), m.sourceSha256, `${side}/${m.target}`);
      assert.equal(sha(await fs.readFile(path.join(outputs[side], m.target))), m.sha256, `${side}/${m.target}`);
      const code = bytes.toString(), decls = new Map();
      for (const node of parsers.babel.parse(code, {}).program.body) {
        if (node.type === 'FunctionDeclaration') decls.set(node.id.name, code.slice(node.start, node.end));
        if (node.type === 'VariableDeclaration') for (const d of node.declarations) if (d.id.type === 'Identifier') decls.set(d.id.name, code.slice(d.start, d.end));
      }
      for (const b of m.bindings) assert.equal(sha(decls.get(b.name) ?? ''), b.sha256, `${m.source}#${b.name}`);
    }
  }
});

test('roots: the renamed 4.16336.0 declarations, each pinned by features and export alias', () => {
  const by = (side, target) => manifests[side].modules.find((m) => m.target === target);
  assert.deepEqual(Object.keys(by('renderer', 'turn-tail.mjs').exports), ['Gr', 'Er', 'Kr', 'Lr', 'zr']);
  assert.equal(by('renderer', 'turn-tail.mjs').source, 'c4ea84cb3-RflkeHS4.js');
  assert.deepEqual(Object.keys(by('renderer', 'settled-turn-box.mjs').exports), ['pvt', 'g7', '_7']);
  assert.equal(by('renderer', 'prompt-of-row.mjs').source, 'c71ae93f1-Cz_h3B0l.js');
  assert.equal(by('renderer', 'wrap-up-chips.mjs').part, 'chips');
  assert.equal(by('renderer', 'plan-update.mjs').source, 'cb27dab29-Cw2yQaFh.js');
  assert.equal(by('main', 'ccd-turn.mjs').source, 'index.chunk-wiGqt7B_.js');
  assert.equal(by('main', 'turn-names.mjs').source, 'index.chunk-Du-Wqi0E.js');
  for (const side of ['renderer', 'main']) for (const m of manifests[side].modules)
    for (const root of Object.keys(m.exports)) assert.ok(contract.modules.find((s) => s.target === m.target).features[root]?.length, `${m.target}:${root} has features`);
  // Host adapters: intl, turnBoxAtReplies, GrowthBook and event logging, each feature-checked against the original.
  const adapters = [...manifests.renderer.modules, ...manifests.main.modules].flatMap((m) => m.imports.filter((i) => i.kind === 'adapter').map((i) => i.name));
  for (const name of ['useIntl', 'useTurnBoxAtReplies', 'growthBookOn', 'growthBookValue', 'logEvent']) assert.ok(adapters.includes(name), name);
  assert.equal(manifests.renderer.callSites.length + manifests.main.callSites.length, 11);
});

test('D1 / D46: dependency-held bindings are linked, cds-core names are linked, no module state is refused', () => {
  const imports = manifests.renderer.modules.flatMap((m) => m.imports);
  // shared-62 zI (and through it the kI Set, a d1 wave5 candidate) comes from routines-shared-v4; kI is never cut here.
  const zI = imports.find((i) => i.original === 'zI' && i.via.startsWith('shared-62-DoCqVpIq.js'));
  assert.equal(zI?.kind, 'linked');
  assert.equal(zI.from, '../routines-shared-v4/shared-62-DoCqVpIq.mjs');
  assert.ok(!manifests.renderer.modules.some((m) => m.source === 'shared-62-DoCqVpIq.js' && m.bindings.some((b) => b.name === 'kI')));
  assert.ok(imports.some((i) => i.kind === 'linked' && i.from === '../r3b-tasks/lazy-value.mjs' && i.name === 'lazyValue'));
  assert.ok(imports.some((i) => i.kind === 'shared-graph' && i.from.startsWith('../cds-core/')));
  for (const pin of manifests.renderer.linkedAreas) assert.match(pin.sha256, /^[0-9a-f]{64}$/);
  // No module of this graph cuts a binding cds-core publishes.
  for (const m of manifests.renderer.modules) for (const b of m.bindings) assert.ok(!imports.some((i) => i.kind === 'shared-graph' && i.via === `${m.source}#${b.name}`));
});

test('main process: the 4.16336.0 ccd_turn server and handler (update_plan scope, wrap_up recap, noWrapUp)', async () => {
  const m = await import('../src/generated/turn-plan-v4/main/ccd-turn.mjs');
  const names = await import('../src/generated/turn-plan-v4/main/turn-names.mjs');
  assert.equal(names.UPDATE_PLAN_TOOL_NAME, 'mcp__ccd_turn__update_plan');
  assert.equal(names.WRAP_UP_TOOL_NAME, 'mcp__ccd_turn__wrap_up');
  assert.match(names.SUBAGENT_TURN_TOOL_REFUSAL, /^Not shown: you are a subagent/);
  const def = m.turnServerDefinition();
  assert.equal(def.serverName, 'ccd_turn');
  assert.deepEqual(def.tools.map((t) => t.name), ['update_plan', 'wrap_up']);
  assert.deepEqual(m.turnServerDefinition(true, true, true).tools.map((t) => t.name), ['update_plan']);
  assert.equal(def.isEnabled({ sessionType: 'ccd', turnBoxEnabled: true }), true);
  assert.equal(def.isEnabled({ sessionType: 'ccd', turnBoxEnabled: false }), false);
  assert.equal(m.turnToolsOn(), true);
  const h = m.createTurnToolHandler(), ctx = { sessionId: 's1' };
  const items = [{ content: 'Read', status: 'in_progress' }, { content: 'Write', status: 'pending' }];
  const text = (r) => r.content[0].text;
  const noScope = await h('update_plan', { items }, ctx);
  assert.equal(noScope.isError, true);
  assert.match(text(noScope), /items also needs "scope"/);
  assert.equal(text(await h('update_plan', { items, scope: 'first_task' }, ctx)), 'Plan shown (2 steps).');
  assert.equal(text(await h('update_plan', { advance: true }, ctx)), 'Plan updated: step 2 of 2 is in progress.');
  assert.match(text(await h('update_plan', { done: [9] }, ctx)), /^Nothing changed: done and start take whole step numbers/);
  assert.match(text(await h('wrap_up', {}, ctx)), /^recap is required/);
  assert.match(text(await h('wrap_up', { recap: 'Fixed it.' }, ctx)), /^Nothing is pending, so the app draws no box/);
  assert.deepEqual(m.TURN_ALLOWED_TOOLS, ['mcp__ccd_turn__wrap_up', 'mcp__ccd_turn__update_plan']);
  assert.deepEqual(Object.keys(m.turnPlanHooks(() => undefined, false)), ['PostToolUse', 'SessionStart']);
});

test('renderer: plan readers, the turn tail and the settled wrap-up receipt run from the generated originals', () => {
  assert.equal(plan.isWrapUpTool('WrapUp'), true);
  assert.equal(plan.isUpdatePlanTool('mcp__ccd_turn__update_plan'), true);
  assert.deepEqual(plan.planFromItems({ items: [{ content: 'A', status: 'done' }] }), [{ id: 'plan-0', content: 'A', status: 'pending' }]);
  const msgs = [
    { type: 'user', uuid: 'p1', message: { role: 'user', content: 'do it' } },
    { type: 'assistant', uuid: 'a1', message: { role: 'assistant', content: [{ type: 'tool_use', id: 't1', name: 'mcp__ccd_turn__update_plan', input: { items: [{ content: 'Read', status: 'in_progress' }, { content: 'Write', status: 'pending' }] } }] } },
    { type: 'user', uuid: 'r1', message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: 't1', content: 'Plan shown (2 steps).' }] } },
    { type: 'assistant', uuid: 'a2', message: { role: 'assistant', content: [{ type: 'tool_use', id: 't2', name: 'mcp__ccd_turn__update_plan', input: { advance: true } }] } },
  ];
  const t = tail.deriveTurnTail(msgs, 'p1');
  assert.deepEqual(t.plan, [{ id: 'plan-0', content: 'Read', status: 'completed' }, { id: 'plan-1', content: 'Write', status: 'in_progress' }]);
  assert.equal(t.planTouchedThisTurn, true);
  assert.equal(tail.turnTailEqual(t, t), true);
  assert.equal(tail.EMPTY_TURN_TAIL.closingMessageFollows, false);
  assert.deepEqual(row.promptOfRow({ id: 'e1', author: 'user', items: [{ kind: 'text', id: 'x', text: 'hello there' }] }), { entryId: 'e1', text: 'hello there' });
  const wrapUp = plan.parseWrapUp({ recap: 'Fixed the bug.', ask: 'Ship it?', actions: [{ label: 'Yes' }, { label: 'No' }] }, 'mcp__ccd_turn__wrap_up');
  assert.deepEqual(box.settledTurnBoxPairs({ wrapUp, prompt: 'Yes' }, undefined, true), { question: 'Ship it?', answer: '' });
  const html = renderToStaticMarkup(React.createElement(box.SettledTurnBox, { wrapUp, prompt: 'Yes' }));
  assert.match(html, /epitaxy-question-receipt/);
  assert.match(html, /Fixed the bug\./);
  assert.match(html, />Ship it\?</);
  assert.match(html, />Yes</);
});

test('fails closed: a changed root feature, export alias or an unlisted chunk stops generation (no pin refresh)', async () => {
  const variant = (edit) => { const c = structuredClone({ ...contract, allowedGlobals: [...contract.allowedGlobals] }); edit(c); c.allowedGlobals = new Set(c.allowedGlobals); return c; };
  await assert.rejects(extractTurnPlanV4({ check: true, variant: variant((c) => { c.modules[0].features.Me = ['"every step is finished"']; }) }), /root Me is not the unique declaration/);
  await assert.rejects(extractTurnPlanV4({ check: true, variant: variant((c) => { c.modules[0].exportAlias.vt = 'xx'; }) }), /root vt is exported as jt, expected xx/);
  await assert.rejects(extractTurnPlanV4({ check: true, variant: variant((c) => { c.modules = c.modules.filter((m) => m.target !== 'remote-control.mjs'); }) }), /index\.chunk-DJMw3cXE\.js.*not a listed chunk/);
  await assert.rejects(extractTurnPlanV4({ variant: contract }), /check \/ dryRun \/ survey only/);
});
