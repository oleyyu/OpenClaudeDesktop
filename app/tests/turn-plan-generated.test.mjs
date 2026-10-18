// turn-plan: scripts/extract-turn-plan.mjs output is current (--check), the pinned official strings are in the installed
// chunks once each, and the generated renderer originals (cb27dab29 z / Se) read update_plan inputs as the official
// turn tail does. No network, no process, no port.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const app = path.resolve(import.meta.dirname, '..');
const snapshot = path.resolve(app, '../reference/installed-2.42304.0-20261017');
const has = fs.existsSync(snapshot);
const count = (text, needle) => text.split(needle).length - 1;

test('extract-turn-plan --check: the generated modules match the installed 2.42304.0 chunks', { skip: !has }, async () => {
  const { extractTurnPlan } = await import('../scripts/extract-turn-plan.mjs');
  const manifests = await extractTurnPlan({ check: true });
  assert.deepEqual(manifests.main.modules.map((m) => m.target).sort(), ['ccd-turn.mjs', 'text-guards.mjs', 'tool-result.mjs']);
  for (const target of ['plan-update.mjs', 'turn-tail.mjs', 'settled-turn-box.mjs', 'secret-redaction.mjs', 'strip-markup.mjs', 'cb6930dae.mjs', 'cd4f82e77.mjs', 'c06cf64bb.mjs'])
    assert.ok(manifests.renderer.modules.some((m) => m.target === target), target);
  // Every renderer module is an original chunk slice; the only host imports are the turn box's intl adapters and React.
  const kinds = new Set(manifests.renderer.modules.flatMap((m) => m.imports.map((i) => i.kind)));
  assert.deepEqual([...kinds].sort(), [...kinds].filter((k) => ['adapter', 'generated', 'react', 'view-tabs'].includes(k)).sort());
  assert.deepEqual([...new Set(manifests.renderer.modules.flatMap((m) => m.imports.filter((i) => i.kind === 'adapter').map((i) => i.name)))].sort(), ['FormattedMessage', 'useIntl'].filter((n) => manifests.renderer.modules.some((m) => m.imports.some((i) => i.name === n))).sort());
  const tail = manifests.renderer.modules.find((m) => m.target === 'turn-tail.mjs');
  for (const name of ['Rt', 'Ft', 'It', 'Pt', 'Mt', 'Et']) assert.ok(tail.bindings.some((b) => b.name === name), name);
  assert.equal(manifests.renderer.callSites.length + manifests.main.callSites.length, 11);
  const ccd = manifests.main.modules.find((m) => m.target === 'ccd-turn.mjs');
  assert.deepEqual(ccd.imports.filter((i) => i.kind === 'adapter').map((i) => `${i.via}=${i.name}`), ['index.chunk-muI2IV6k.js:LZ=growthBookOn', 'index.chunk-muI2IV6k.js:iz=logEvent']);
  for (const name of ['Qt', 'Zt', 'Tt', 'Et', 'Ft', 'Lt', 'Xt', 'Qe', 'et', '$e', 'Ze', 'ot', 'ct', 'ft', 'st']) assert.ok(ccd.bindings.some((b) => b.name === name), name);
  // verify-gen is the one-line D0 form prepare-ui discovers.
  assert.equal(fs.readFileSync(path.join(app, 'scripts/verify-gen-turn-plan.mjs'), 'utf8'), "import { extractTurnPlan } from './extract-turn-plan.mjs'; await extractTurnPlan({ check: true });\n");
});

test('official strings: the ccd_turn server, its gate, the sub-agent deny, the renderer reading and the skipped row', { skip: !has }, () => {
  const main = (name) => fs.readFileSync(path.join(snapshot, 'asar/.vite/build', name), 'utf8');
  const renderer = (name) => fs.readFileSync(path.join(snapshot, 'ion-dist/assets/v1', name), 'utf8');
  const b5 = main('index.chunk-B5tintml.js');
  for (const needle of ['var tt="ccd_turn",nt="wrap_up",rt="update_plan",it=`mcp__${tt}__${nt}`,at=`mcp__${tt}__${rt}`', 'function ht(){return t.LZ("2371478310")}',
    'isEnabled:e=>e.sessionType==="ccd"&&e.turnBoxEnabled===!0', 'c.push(Qt(a!==!1))', '"every step is done"', 'Plan shown (${o.length} steps).',
    'var Tt=e=>`Keep the task list the app shows under your latest message while you work.']) assert.equal(count(b5, needle), 1, needle);
  assert.equal(count(main('index.chunk-CFJssAFf.js'), 'permissionDecisionReason:n.zu'), 1);
  const cb27 = renderer('cb27dab29-_H2_XKli.js');
  for (const needle of ['ye="mcp__ccd_turn__update_plan"', 'function Se(e,t){if(Array.isArray(t.items))return z(t);', 'id:`plan-${n.length}`']) assert.equal(count(cb27, needle), 1, needle);
  const c06 = renderer('c06cf64bb-BE5q2vSr.js');
  assert.equal(count(c06, 'if(n&&zr(o.name))continue;'), 1);
  assert.equal(count(c06, 'if(o&&zr(r.name))continue;'), 1);
});

test('generated z / Se: the plan an update_plan input gives, and an update applied over it', async () => {
  const { planFromItems, applyPlanUpdate, isUpdatePlanTool, UPDATE_PLAN_TOOL } = await import('../src/generated/turn-plan/plan-update.mjs');
  assert.equal(UPDATE_PLAN_TOOL, 'mcp__ccd_turn__update_plan');
  assert.equal(isUpdatePlanTool('mcp__ccd_turn__update_plan'), true);
  const plan = planFromItems({ items: [{ content: 'Read', status: 'completed' }, { content: 'Fix', status: 'in_progress', session: 'side-1' }, { content: 'Test', status: 'weird' }, { content: '  ' }, null, { content: 7, status: 'pending' }] });
  assert.deepEqual(plan, [
    { id: 'plan-0', content: 'Read', status: 'completed' },
    { id: 'plan-1', content: 'Fix', status: 'in_progress', session: 'side-1' },
    { id: 'plan-2', content: 'Test', status: 'pending' },
    { id: 'plan-3', content: '7', status: 'pending' },
  ]);
  assert.equal(planFromItems({ items: Array.from({ length: 20 }, (_, i) => ({ content: `s${i}`, status: 'pending' })) }).length, 12);
  assert.deepEqual(applyPlanUpdate(plan, { advance: true }).map((s) => s.status), ['completed', 'completed', 'in_progress', 'pending']);
  assert.deepEqual(applyPlanUpdate(plan, { done: [2], start: 4 }).map((s) => s.status), ['completed', 'completed', 'pending', 'in_progress']);
  assert.deepEqual(applyPlanUpdate(plan, { done: [9] }).map((s) => s.status), ['completed', 'in_progress', 'pending', 'pending']);
  assert.deepEqual(applyPlanUpdate(plan, { items: [{ content: 'New', status: 'in_progress' }] }), [{ id: 'plan-0', content: 'New', status: 'in_progress' }]);
});
