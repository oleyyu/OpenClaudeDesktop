// turn-plan: scripts/extract-turn-plan.mjs output is current (--check), the pinned official strings are in the installed
// chunks once each, and the generated renderer originals (cb27dab29 z / Se) read update_plan inputs as the official
// turn tail does. No network, no process, no port.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const app = path.resolve(import.meta.dirname, '..');
// 3.6556.2: the main-process side moved in w2-tr-turn, the renderer side in w8-turn-plan-renderer; both read the snapshot.
const snapshot = path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807');
const mainSnapshot = snapshot;
const has = fs.existsSync(snapshot);
const count = (text, needle) => text.split(needle).length - 1;

test('extract-turn-plan --check: the generated modules match the official chunks (main and renderer 3.6556.2)', { skip: !has }, async () => {
  const { extractTurnPlan } = await import('../scripts/extract-turn-plan.mjs');
  const manifests = await extractTurnPlan({ check: true });
  assert.equal(manifests.main.referenceVersion, '3.6556.2');
  assert.equal(manifests.main.referenceSnapshot, 'snapshots/claude-3.6556.2-20261025-192807');
  assert.equal(manifests.renderer.referenceVersion, '3.6556.2');
  assert.equal(manifests.renderer.referenceSnapshot, 'snapshots/claude-3.6556.2-20261025-192807');
  assert.ok(manifests.renderer.modules.every((m) => m.referenceVersion === '3.6556.2'));
  assert.ok(manifests.main.modules.every((m) => m.referenceVersion === '3.6556.2'));
  // The MCP text / error results moved into index.chunk-jPKPzV-P (text-guards.mjs); tool-result.mjs is gone.
  assert.deepEqual(manifests.main.modules.map((m) => m.target).sort(), ['ccd-turn.mjs', 'remote-control.mjs', 'text-guards.mjs']);
  for (const target of ['plan-update.mjs', 'turn-tail.mjs', 'settled-turn-box.mjs', 'wrap-up-chips.mjs', 'secret-redaction.mjs', 'strip-markup.mjs', 'cb6930dae.mjs', 'cd4f82e77.mjs', 'c06cf64bb.mjs'])
    assert.ok(manifests.renderer.modules.some((m) => m.target === target), target);
  const bySource = (source) => manifests.renderer.modules.filter((m) => m.source === source);
  assert.deepEqual(bySource('cb27dab29-B4WyL7_M.js').map((m) => m.target), ['plan-update.mjs']);
  assert.deepEqual(bySource('c4ea84cb3-rXGDAnKH.js').map((m) => m.target), ['turn-tail.mjs']);
  // E42: c96d752d0 is two modules: the reply chip the plain turn tail reads (a part), and the compiled SettledTurnBox.
  assert.deepEqual(bySource('c96d752d0-CWv_7-n9.js').map((m) => [m.target, m.part ?? null]).sort(), [['settled-turn-box.mjs', null], ['wrap-up-chips.mjs', 'chips']]);
  // Every renderer module is an original chunk slice; the only host imports are the turn box's adapters (intl and
  // turnBoxAtReplies), React and the shared view-tabs graph (compiler helpers).
  const kinds = new Set(manifests.renderer.modules.flatMap((m) => m.imports.map((i) => i.kind)));
  assert.deepEqual([...kinds].sort(), [...kinds].filter((k) => ['adapter', 'generated', 'react', 'view-tabs', 'linked'].includes(k)).sort());
  // D1 (w13-close-gen-dedup, w12-carry-01): shared-156's display-safety helpers are code-routines' one copy, so no
  // shared-156 module here; VX comes from that plain module. shared-0's Pa / AL / ML (and the jL ML reads) are
  // routines-shared's one copy (no import at all, plain node loads it), so shared-0.mjs no longer slices them.
  assert.deepEqual(manifests.renderer.modules.filter((m) => m.source === 'shared-156-BLTosN8U.js'), []);
  assert.deepEqual(manifests.renderer.modules.flatMap((m) => m.imports.filter((i) => i.kind === 'linked').map((i) => `${m.target}:${i.from}#${i.name}`)).sort(), [
    'cb6930dae.mjs:../code-routines/shared-156-BLTosN8U.mjs#VX',
    'cd4f82e77.mjs:../routines-shared/shared-0-DDOOdL6P.mjs#Pa',
    'secret-redaction.mjs:../routines-shared/shared-0-DDOOdL6P.mjs#AL',
    'secret-redaction.mjs:../routines-shared/shared-0-DDOOdL6P.mjs#Pa',
    'shared-25.mjs:../routines-shared/shared-0-DDOOdL6P.mjs#ML',
    'shared-25.mjs:../routines-shared/shared-0-DDOOdL6P.mjs#Pa',
    'wrap-up-chips.mjs:../routines-shared/shared-0-DDOOdL6P.mjs#Pa',
  ]);
  const shared0 = manifests.renderer.modules.find((m) => m.target === 'shared-0.mjs');
  for (const name of ['Pa', 'AL', 'jL', 'ML']) assert.ok(!shared0.bindings.some((b) => b.name === name), name);
  assert.deepEqual([...new Set(manifests.renderer.modules.flatMap((m) => m.imports.filter((i) => i.kind === 'adapter').map((i) => `${i.from}:${i.name}`)))].sort(),
    ['../../source-turn-box-adapters.jsx:useIntl', '../../source-turn-box-adapters.jsx:useTurnBoxAtReplies']);
  // R6/E3: view-tabs only by semantic name from concrete files; E42: never the shared-0 storage wrappers (sliced here).
  for (const m of manifests.renderer.modules) for (const i of m.imports.filter((i) => i.kind === 'view-tabs')) {
    assert.match(i.from, /^\.\.\/view-tabs\/[\w-]+\.js$/, `${m.target}: ${i.from}`);
    assert.ok(!['safeLocalStorage', 'getWindowStorage', 'createSafeStorage'].includes(i.name), `${m.target}: ${i.name}`);
  }
  const tail = manifests.renderer.modules.find((m) => m.target === 'turn-tail.mjs');
  for (const name of ['Br', 'Er', 'Y', 'Ir', 'Rr', 'Lr', 'J', 'Nr', 'Mr', 'Vr']) assert.ok(tail.bindings.some((b) => b.name === name), name);
  assert.deepEqual(tail.exports, { Br: 'deriveTurnTail', Er: 'EMPTY_TURN_TAIL', Y: 'turnTailEqual', Ir: 'wrapUpsByPrompt', Rr: 'wrapUpReceipt' });
  assert.equal(manifests.renderer.callSites.length + manifests.main.callSites.length, 12);
  const ccd = manifests.main.modules.find((m) => m.target === 'ccd-turn.mjs');
  assert.equal(ccd.source, 'index.chunk-DBIg6EBr.js');
  assert.deepEqual(ccd.imports.filter((i) => i.kind === 'adapter').map((i) => `${i.via}=${i.name}`),
    ['index.chunk-jPKPzV-P.js:h0=growthBookValue', 'index.chunk-jPKPzV-P.js:m0=growthBookOn', 'index.chunk-jPKPzV-P.js:uz=logEvent']);
  for (const name of ['Yt', 'Jt', '_t', 'vt', 'jt', 'kt', 'At', 'Nt', 'Qe', 'et', 'We', 'Ke', 'Ge', 'Ue', 'it', 'st', 'Dt', 'Tt']) assert.ok(ccd.bindings.some((b) => b.name === name), name);
  // verify-gen is the one-line D0 form prepare-ui discovers.
  assert.equal(fs.readFileSync(path.join(app, 'scripts/verify-gen-turn-plan.mjs'), 'utf8'), "import { extractTurnPlan } from './extract-turn-plan.mjs'; await extractTurnPlan({ check: true });\n");
});

test('official strings: the ccd_turn server, its gate, the sub-agent deny, the renderer reading and the skipped row', { skip: !has }, () => {
  const main = (name) => fs.readFileSync(path.join(mainSnapshot, 'asar/.vite/build', name), 'utf8');
  const renderer = (name) => fs.readFileSync(path.join(snapshot, 'ion-dist/assets/v1', name), 'utf8');
  const db = main('index.chunk-DBIg6EBr.js');
  for (const needle of ['var qe="ccd_turn",Je="wrap_up",Ye="update_plan",Xe=`mcp__${qe}__${Je}`,Ze=`mcp__${qe}__${Ye}`', 'function st(){return t.m0("2371478310")}',
    'isEnabled:e=>e.sessionType==="ccd"&&e.turnBoxEnabled===!0', 'l.push(Yt(a!==!1,s))', '"every step is done"', ',Dt=()=>t.h0("2833454025",!0)',
    'var _t=e=>`Keep the task list the app shows under your latest message while you work.', 'jt=e=>`Fill the "next step" box']) assert.equal(count(db, needle), 1, needle);
  assert.equal(count(main('index.chunk-DNPOm2Zc.js'), 'permissionDecisionReason:n.kd'), 1);
  const cb27 = renderer('cb27dab29-B4WyL7_M.js');
  for (const needle of ['be="mcp__ccd_turn__update_plan"', 'function Ce(e,t){if(Array.isArray(t.items))return z(t);', 'id:`plan-${n.length}`']) assert.equal(count(cb27, needle), 1, needle);
  const c06 = renderer('c06cf64bb-CdJdJuVd.js');
  assert.equal(count(c06, 'if(n&&Qi(o.name))continue;'), 1);
  assert.equal(count(c06, 'if(o&&Qi(r.name))continue;'), 1);
  // The 3.6556.2 turn tail derives the closing message and the cut-short plan.
  const c4e = renderer('c4ea84cb3-rXGDAnKH.js');
  for (const needle of ['closingMessageFollows:he!==null&&Lr(e,he)', 'planCutShort:x&&!C', 'var Ar=new Set(["TodoWrite","TaskCreate","TaskUpdate"])']) assert.equal(count(c4e, needle), 1, needle);
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
