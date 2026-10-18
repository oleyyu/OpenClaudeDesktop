// R4g-turnbox TB-3 / TB-5 (transcript-turn-box, tasks-06a): the Code session turn box mount (src/source-turn-box.jsx) —
// cc43287c9 Mte's conditions and O5's slot / inline placement, cf74bc599's transcript tail slot (c12c146ad D), the
// card-shown report, the plan marks and the TurnBoxHost over the real state.js reducer — and DT's "hidden while the
// next-step row shows" rule against the loaded official stylesheet. SSR for markup (no effects or refs run there, so the
// placement is fixed by the test), pure functions called directly. No browser, no DOM, no network, no real session.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { emptyState, reduce } from '../src/state.js';

const app = path.resolve(import.meta.dirname, '..');
const reference = path.resolve(app, '../reference/installed-2.42304.0-20261017/ion-dist/assets/v1');
const official = (name) => fs.readFileSync(path.join(reference, name), 'utf8');
const count = (text, needle) => text.split(needle).length - 1;
let server, M, B, A;
before(async () => {
  // hmr / ws off: the test listens on no port.
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  M = await server.ssrLoadModule('/src/source-turn-box.jsx');
  B = await server.ssrLoadModule('/src/generated/turn-box/turn-box.mjs');
  A = await server.ssrLoadModule('/src/source-turn-box-adapters.jsx');
});
after(async () => { await server?.close(); });

const event = (method, params) => ({ kind: 'notification', method, params });
const apply = (state, method, params) => reduce(state, { event: event(method, params) });
const user = (id, turnId) => ({ id, type: 'userMessage', turnId, content: [{ type: 'text', text: id }] });
const steps = [{ step: 'Read the code', status: 'completed' }, { step: 'Fix the bug', status: 'inProgress' }, { step: 'Run the tests', status: 'pending' }];
// turn-plan: the box reads the session's update_plan calls (c1ebb1aa4 Rt's update_plan branch, turnBox on); the same steps as
// one items call of OpenClaude Desktop's ccd_turn tool.
const planCall = (id, turnId, plan = steps) => ({ id, type: 'mcpToolCall', server: 'code_desktop', tool: 'update_plan', turnId, status: 'completed',
  arguments: { scope: 'first_task', items: plan.map((s) => ({ content: s.step, status: s.status === 'inProgress' ? 'in_progress' : s.status })) },
  result: { content: [{ type: 'text', text: `Plan shown (${plan.length} steps).` }] } });
const ref = { id: 'P', type: 'local' };

// The host built over a state (the hook runs inside one SSR render).
function hostFor(state, marks, extra = {}) {
  let host = null;
  function Probe() { host = M.useCodeTurnBoxHost({ state, planMarks: marks, currentId: 'P', requestOwner: (r) => r.params.threadId, ...extra }); return null; }
  renderToStaticMarkup(React.createElement(Probe));
  return host;
}
// A turn that wrote the plan; the reducer records each plan mark (R4i-transcript TR1: state.js turn/plan/updated).
function planTurn() {
  let state = emptyState;
  const step = (method, params) => { state = apply(state, method, params); };
  step('turn/started', { threadId: 'P', turn: { id: 't1' } });
  step('item/completed', { threadId: 'P', turnId: 't1', item: user('u1', 't1') });
  step('turn/plan/updated', { threadId: 'P', turnId: 't1', explanation: null, plan: steps });
  step('item/completed', { threadId: 'P', turnId: 't1', item: planCall('plan-call-1', 't1') });
  return { get state() { return state; }, get marks() { return M.useTurnBoxPlanMarks(state); }, step };
}
const mount = (host, props = {}) => renderToStaticMarkup(React.createElement(A.TurnBoxHost.Provider, { value: host },
  React.createElement(M.SourceTurnBoxMount, { host, scope: M.createTurnBoxScope(), placement: { slotEl: null, placeable: true },
    sessionRef: ref, isResponding: true, latestPromptId: 'u1', composerRef: { current: null }, hasComposerDraft: () => false, ...props })));

test('TB-3 official mount: the installed chunks carry each pinned string once', () => {
  const composer = official('cc43287c9-DAfOi8yP.js');
  for (const needle of [
    'function O5(e,t=!1){let n=tp(e,e=>e.turnBoxSlotEl),[r,i]=f(null),a=A(t=>{t!==null&&i(e)},[e]);return{slotEl:n,placeable:n!==null||r===e&&!t,probeRef:a}}',
    '{slotEl:oo,placeable:so,probeRef:co}=O5(Zn,ao),lo=Na&&da&&!tn&&!on,uo=lo&&so,fo=lo&&tr!==null&&Yr',
    'v("span",{hidden:!0,ref:co}),uo&&tr?(()=>{let e=v(gte,{sessionRef:tr,isResponding:ui||zi,latestPromptId:Ia,onCardShownChange:Fa,children:fo?v(bte,{',
    'return v(tm.Provider,{value:mr,children:oo?g(e,oo):e})})():null',
    'Fa=A(e=>Zn.setState({turnCardShown:e}),[Zn])',
    'vl=hl?.tool.name==="ExitPlanMode"&&hl.inputWithheld!==!0',
    ',Td as Ur,',
  ]) assert.equal(count(composer, needle), 1, needle);
  const transcript = official('cf74bc599-D9NZWRyl.js');
  for (const needle of ['qi=b(e=>n.setState({turnBoxSlotEl:e}),[n]),Ji=f(()=>u(Kg,{onElement:qi}),[qi])', 'tailSlot:ii||Qi?Ji:void 0', 'ii=nu(t)', 'Yt as nu', 'm as Kg'])
    assert.equal(count(transcript, needle), 1, needle);
  assert.equal(count(official('c12c146ad-CuJdg7K3.js'), 'D=o(function({onElement:e}){return n("div",{ref:e,"data-inline-approval-slot":""})})'), 1);
  assert.equal(count(official('c12c146ad-CuJdg7K3.js'), 'D as m'), 1);
  const visible = 'function MM(e){return!e.isReadOnly&&!e.isReviewSession&&!e.showFolderRecoveryNotice&&e.slackReplyMode==="off"&&!e.orgSendBlocked&&!e.isPlanApproval&&!e.hideComposer}';
  assert.equal(count(official('shared-19-CkPOiIKm.js'), visible), 1);
  assert.equal(count(official('shared-19-CkPOiIKm.js'), ',MM as Td,'), 1);
  // The host port keeps the same expressions.
  const port = fs.readFileSync(path.join(app, 'src/source-turn-box.jsx'), 'utf8');
  assert.ok(port.includes('placeable: slotEl !== null || (probed === scope && !awaitsList)'));
  assert.ok(port.includes('<div ref={onElement} data-inline-approval-slot="" />'));
});

test('TB-3 conditions: MM, lo / uo / fo, the presets side of Iq', () => {
  assert.equal(M.composerShown({}), true);
  for (const key of ['isReadOnly', 'isReviewSession', 'showFolderRecoveryNotice', 'orgSendBlocked', 'isPlanApproval', 'hideComposer'])
    assert.equal(M.composerShown({ [key]: true }), false, key);
  assert.equal(M.composerShown({ slackReplyMode: 'reply' }), false);
  const base = { canHost: true, composerVisible: true, placeable: true, hasSession: true, nextRowGate: true };
  assert.deepEqual(M.turnBoxMountFlags(base), { eligible: true, mounted: true, nextRow: true });
  assert.deepEqual(M.turnBoxMountFlags({ ...base, placeable: false }), { eligible: true, mounted: false, nextRow: true });
  assert.deepEqual(M.turnBoxMountFlags({ ...base, isPlanApproval: true }), { eligible: false, mounted: false, nextRow: false });
  assert.deepEqual(M.turnBoxMountFlags({ ...base, isReadOnly: true }), { eligible: false, mounted: false, nextRow: false });
  assert.deepEqual(M.turnBoxMountFlags({ ...base, composerVisible: false }), { eligible: false, mounted: false, nextRow: false });
  assert.deepEqual(M.turnBoxMountFlags({ ...base, nextRowGate: false }), { eligible: true, mounted: true, nextRow: false });
  // `oo?g(e,oo):e`
  const el = React.createElement('i'), slot = { nodeType: 1 };
  assert.equal(M.placeTurnBox(el, null, () => assert.fail('no portal without a slot')), el);
  assert.deepEqual(M.placeTurnBox(el, slot, (child, target) => ({ child, target })), { child: el, target: slot });
});

test('TB-3 slot and scope: the tail slot element, setState only on change, cardShown written by the box', () => {
  const scope = M.createTurnBoxScope();
  assert.equal(renderToStaticMarkup(React.createElement(M.SourceTurnBoxSlot, { scope })), '<div data-inline-approval-slot=""></div>');
  let calls = 0;
  const off = scope.subscribe(() => { calls++; });
  scope.setState({ turnCardShown: true });
  scope.setState({ turnCardShown: true });
  assert.equal(calls, 1);
  assert.equal(scope.getState().turnCardShown, true);
  const slot = { nodeType: 1 };
  scope.setState({ turnBoxSlotEl: slot });
  assert.equal(scope.getState().turnBoxSlotEl, slot);
  off();
  scope.setState({ turnBoxSlotEl: null });
  assert.equal(calls, 2);
  // First paint of the region: the probe only (O5 is not placeable until the probe's ref has run).
  const host = hostFor(emptyState, {});
  const first = renderToStaticMarkup(React.createElement(M.SourceTurnBoxRegion, { host, scope: M.createTurnBoxScope(), sessionRef: ref,
    isResponding: true, latestPromptId: 'u1', composerRef: { current: null } }));
  assert.equal(first, '<span hidden=""></span>');
});

test('TB-3 / R4i TR1 plan marks: state.js places each plan write at the turn it names and the prompt then; no mark, no place', () => {
  const turn = planTurn();
  assert.deepEqual(turn.marks, { P: { turnId: 't1', promptId: 'u1' } });
  const before = turn.marks;
  turn.step('item/completed', { threadId: 'P', turnId: 't1', item: { id: 'a1', type: 'agentMessage', text: 'ok', turnId: 't1' } });
  assert.equal(turn.marks, before, 'a non-plan event keeps the marks');
  turn.step('turn/completed', { threadId: 'P', turn: { id: 't1', status: 'completed' } });
  turn.step('turn/started', { threadId: 'P', turn: { id: 't2' } });
  turn.step('item/completed', { threadId: 'P', turnId: 't2', item: user('u2', 't2') });
  assert.deepEqual(turn.marks.P, { turnId: 't1', promptId: 'u1' });
  turn.step('turn/plan/updated', { threadId: 'P', turnId: 't2', explanation: null, plan: steps.map((s) => ({ ...s, status: 'completed' })) });
  assert.deepEqual(turn.marks.P, { turnId: 't2', promptId: 'u2' });
  // The mark is the notification's own turn, not the turn that runs when it is read (a bridge sending turnId:'' gives none).
  turn.step('turn/plan/updated', { threadId: 'P', turnId: '', explanation: null, plan: steps });
  assert.deepEqual(turn.marks.P, { turnId: null, promptId: 'u2' });
  // A state with plans but no marks (none recorded): nothing to place; the hook answers the same empty object.
  assert.deepEqual(M.useTurnBoxPlanMarks({ ...emptyState, plans: { P: steps } }), {});
  assert.equal(M.useTurnBoxPlanMarks(emptyState), M.useTurnBoxPlanMarks({}));
  // The reducer branch is the one-line record (R4i TR1), keeping the steps as before.
  const reducer = fs.readFileSync(path.join(app, 'src/state.js'), 'utf8');
  assert.equal(count(reducer, 'planMarks: { ...state.planMarks, [id]: planMarkFromUpdate(p.turnId, items) }'), 1);
  assert.equal(count(reducer, 'import { planMarkFromUpdate } from "./turn-box-plan-model.mjs";'), 1);
});

test('TB-3 host: the turn tail from the reducer, stable while equal, requests and compaction', () => {
  const turn = planTurn();
  const host = hostFor(turn.state, turn.marks);
  const tail = host.turnTail(ref, 'u1');
  assert.deepEqual(tail.plan.map((t) => [t.content, t.status]), [['Read the code', 'completed'], ['Fix the bug', 'in_progress'], ['Run the tests', 'pending']]);
  assert.equal(tail.planTouchedThisTurn, true);
  assert.equal(tail.planTurnEnded, false);
  assert.equal(tail.wrapUp, null);
  assert.equal(host.turnTail(ref, 'u1'), tail, 'same tail while Bt holds');
  assert.equal(host.turnTail(null, 'u1').plan, null);
  assert.equal(host.awaitsRequest('P'), false);
  const asking = hostFor({ ...turn.state, approvals: [{ method: 'item/commandExecution/requestApproval', params: { threadId: 'P' } }] }, turn.marks);
  assert.equal(asking.awaitsRequest('P'), true);
  assert.equal(asking.requestInTurn('P'), true);
  const compactState = { ...turn.state, items: { P: [...turn.state.items.P, { id: 'c1', type: 'contextCompaction', status: 'inProgress', turnId: 't1' }] } };
  assert.equal(hostFor(compactState, turn.marks).bucket('P').compactionStatus, 'compacting');
  assert.equal(host.bucket('P').compactionStatus, null);
  // The callbacks the host was given (openSession / archive / new session / tasks pane), and none invented.
  const seen = [];
  const wired = hostFor(turn.state, turn.marks, { onOpenSession: (id) => seen.push(['open', id]), onArchiveSession: (id) => seen.push(['archive', id]),
    onNewSession: () => seen.push(['new']), onOpenTasksPane: () => seen.push(['tasks']) });
  wired.openSession({}, { id: 'X' }); wired.archiveSession(ref); wired.startNewSession(); wired.openTasksPane({ finished: false });
  assert.deepEqual(seen, [['open', 'X'], ['archive', 'P'], ['new'], ['tasks']]);
  assert.equal(host.openTasksPane, null);
  assert.equal(host.archiveSession, undefined);
});

test('TB-3 mount: inline under the composer when placeable; nothing when not placeable, read-only, plan approval or no session', () => {
  const turn = planTurn();
  const host = hostFor(turn.state, turn.marks);
  const html = mount(host);
  assert.equal(count(html, 'epitaxy-root motion-safe:animate-fade-in'), 1, 'ET card');
  for (const text of ['Read the code', 'Fix the bug', 'Run the tests']) assert.equal(count(html, text), 1, text);
  assert.equal(count(html, 'data-turn-next=""'), 1);
  assert.equal(count(html, 'Plan from before your last message'), 0);
  assert.equal(mount(host, { placement: { slotEl: null, placeable: false } }), '');
  assert.equal(mount(host, { isReadOnly: true }), '');
  assert.equal(mount(host, { isPlanApproval: true }), '');
  assert.equal(mount(host, { composerVisible: false }), '');
  assert.equal(mount(host, { sessionRef: null }), '');
  // Into the transcript tail slot when the transcript published one (portal), the same element otherwise.
  let portalled = null;
  const slot = { nodeType: 1 };
  assert.equal(mount(host, { placement: { slotEl: slot, placeable: true }, portal: (child, target) => { portalled = { child, target }; return null; } }), '');
  assert.equal(portalled.target, slot);
  assert.equal(portalled.child.type, B.TurnBox);
  assert.equal(portalled.child.key, 'P:turn-box');
  // turn-plan: the row sits in the catalog that names its chip group (secret:hlf4y0), keyed as the row was.
  const nextRow = portalled.child.props.children;
  assert.equal(nextRow.key, 'P:next-actions');
  assert.equal(nextRow.props.children.type, B.NextActionsRow, 'fo: the next-step row mounts with presets on');
  assert.equal(nextRow.props.children.props.wrapUp, null);
  assert.equal(typeof portalled.child.props.onCardShownChange, 'function');
  // A steer (a new prompt inside the same running turn) after the plan was written: rv's stale "prompt" card.
  turn.step('item/completed', { threadId: 'P', turnId: 't1', item: user('u2', 't1') });
  const stale = mount(hostFor(turn.state, turn.marks), { latestPromptId: 'u2' });
  assert.equal(count(stale, 'Plan from before your last message'), 1);
  // The turn ended (planTurnEnded): rv returns null, no card; the next row alone, empty and hidden by its own rule.
  turn.step('turn/completed', { threadId: 'P', turn: { id: 't1', status: 'completed' } });
  const settled = mount(hostFor(turn.state, turn.marks), { latestPromptId: 'u2', isResponding: false });
  assert.equal(count(settled, '<li'), 0);
  assert.equal(count(settled, 'data-turn-next=""'), 1);
});

// ---- TB-5: DT hides itself while the next-step row beside it shows a button or text ----
// A small tree from SSR markup (React's output is well formed), and the two loaded rules evaluated as written.
const decode = (text) => text.replace(/&(amp|quot|lt|gt|#x27|#39);/g, (_, name) => ({ amp: '&', quot: '"', lt: '<', gt: '>', '#x27': "'", '#39': "'" })[name]);
function parse(html) {
  const root = { tag: '#root', attrs: new Map(), children: [], parent: null };
  let node = root;
  const voids = new Set(['br', 'img', 'input', 'hr', 'meta', 'link', 'source', 'wbr', 'area', 'col', 'embed', 'track', 'param']);
  for (const [, close, tag, attrText = '', selfClose] of html.matchAll(/<(\/?)([a-zA-Z][\w-]*)((?:\s+[^\s=>/]+(?:="[^"]*")?)*)\s*(\/?)>/g)) {
    if (close) { node = node.parent; continue; }
    const attrs = new Map([...attrText.matchAll(/([^\s=>/]+)(?:="([^"]*)")?/g)].map(([, k, v]) => [k, decode(v ?? '')]));
    const el = { tag: tag.toLowerCase(), attrs, children: [], parent: node };
    node.children.push(el);
    if (!selfClose && !voids.has(el.tag)) node = el;
  }
  return root;
}
const descendants = (el) => el.children.flatMap((child) => [child, ...descendants(child)]);
const ancestors = (el) => (el.parent ? [el.parent, ...ancestors(el.parent)] : []);
const next = (el) => el.parent.children[el.parent.children.indexOf(el) + 1];
const underHidden = (el) => ancestors(el).some((a) => a.attrs.has('hidden'));
// :has(+[data-turn-next] button:not([hidden] button):not([data-turn-dismiss] button))
const ruleButton = (el) => { const n = next(el); return !!n?.attrs.has('data-turn-next') && descendants(n).some((d) => d.tag === 'button' && !underHidden(d) && !ancestors(d).some((a) => a.attrs.has('data-turn-dismiss'))); };
// :has(+[data-turn-next] p:not([hidden] p))
const ruleText = (el) => { const n = next(el); return !!n?.attrs.has('data-turn-next') && descendants(n).some((d) => d.tag === 'p' && !underHidden(d)); };
const DT_CLASS = 'flex flex-col gap-1 p-4 [&:has(+[data-turn-next]_button:not([hidden]_button):not([data-turn-dismiss]_button))]:hidden [&:has(+[data-turn-next]_p:not([hidden]_p))]:hidden';
const dtHidden = (html) => { const tree = parse(html); const dt = descendants(tree).find((d) => d.attrs.get('class') === DT_CLASS); assert.ok(dt, 'DT rendered'); return ruleButton(dt) || ruleText(dt); };

test('TB-5 the loaded stylesheet carries both DT rules as display:none', () => {
  const css = fs.readFileSync(path.join(app, 'public/assets/v1/c6a992d55-sXiDGMFQ.css'), 'utf8');
  const rule = '.\\[\\&\\:has\\(\\+\\[data-turn-next\\]_button\\:not\\(\\[hidden\\]_button\\)\\:not\\(\\[data-turn-dismiss\\]_button\\)\\)\\]\\:hidden:has(+[data-turn-next] button:not([hidden] button):not([data-turn-dismiss] button)),'
    + '.\\[\\&\\:has\\(\\+\\[data-turn-next\\]_p\\:not\\(\\[hidden\\]_p\\)\\)\\]\\:hidden:has(+[data-turn-next] p:not([hidden] p)){display:none}';
  assert.equal(count(css, rule), 1);
  assert.equal(count(official('cccc2cf0a-B0D--VZp.js'), '[&:has(+[data-turn-next]_p:not([hidden]_p))]:hidden'), 1);
  assert.equal(count(fs.readFileSync(path.join(app, 'src/generated/turn-box/turn-box.mjs'), 'utf8'), DT_CLASS), 1);
});

test('TB-5 DT is hidden exactly when the next-step row shows text or a non-dismiss button', () => {
  const todos = [{ id: '0', content: 'Fix the bug', status: 'in_progress' }];
  const host = hostFor(emptyState, {});
  const pair = (row) => renderToStaticMarkup(React.createElement(A.TurnBoxHost.Provider, { value: host },
    React.createElement('div', null, React.createElement(B.TurnBoxTodos, { todos, stale: false, working: true, parked: false, agentsRunning: 0 }),
      React.createElement('div', { 'data-turn-next': '', hidden: row.hidden }, row.children))));
  const p = React.createElement('p', null, 'Claude is waiting on you.');
  const button = React.createElement('button', null, 'Create PR');
  const dismissOnly = React.createElement('span', { 'data-turn-dismiss': '' }, React.createElement('button', null, 'Dismiss'));
  assert.equal(dtHidden(pair({ children: null })), false, 'empty row');
  assert.equal(dtHidden(pair({ children: p })), true, 'text');
  assert.equal(dtHidden(pair({ children: button })), true, 'button');
  assert.equal(dtHidden(pair({ children: dismissOnly })), false, 'dismiss only');
  assert.equal(dtHidden(pair({ children: React.createElement('div', { hidden: true }, p, button) })), false, 'inside hidden');
  assert.equal(dtHidden(pair({ hidden: true, children: [p, button] })), false, 'row hidden while working');
  // In the host every card that shows comes with a hidden row: CT's `_` holds whenever DT renders, and hT has no chips
  // or wrap-up text — so DT is never hidden by these rules here (only wrap-up, off, shows a row beside a live plan).
  const turn = planTurn();
  const live = mount(hostFor(turn.state, turn.marks), { children: undefined });
  assert.equal(dtHidden(live), false);
  const tree = parse(live);
  const row = descendants(tree).find((d) => d.attrs.has('data-turn-next'));
  assert.equal(row.attrs.has('hidden'), true);
});

test('TB-3 wiring: main.jsx mounts the slot in the Code transcript tail and the region above the composer', () => {
  const main = fs.readFileSync(path.join(app, 'src/main.jsx'), 'utf8');
  const slot = main.indexOf('{turnBoxSession && <SourceTurnBoxSlot');
  const region = main.indexOf('{turnBoxSession && <SourceTurnBoxRegion');
  assert.equal(count(main, '<SourceTurnBoxSlot '), 1);
  assert.equal(count(main, '<SourceTurnBoxRegion '), 1);
  // The slot sits among the transcript's tail children (before the recap and the working status), the region after the
  // transcript and before the main composer.
  assert.ok(slot > main.indexOf('<SourceTranscript\n') && slot < main.indexOf('</SourceTranscript>'));
  assert.ok(slot < main.indexOf('{recap && <SourceRecapCard'));
  assert.ok(region > main.indexOf('</SourceTranscript>') && region < main.indexOf('{renderMainComposer()}\n                {!current && mode === \'cowork\''));
  assert.ok(main.includes('const turnBoxSession = useMemo(() => codeTurnBoxSession(current, mode), [current, mode]);'));
  assert.deepEqual(M.codeTurnBoxSession('P', 'code'), { id: 'P', type: 'local' });
  assert.equal(M.codeTurnBoxSession('P', 'cowork'), null);
  assert.equal(M.codeTurnBoxSession(null, 'code'), null);
});

test('TB-6 zh-CN: the box copy is translated (Claude kept, D23)', async (context) => {
  const i18n = await server.ssrLoadModule('/electron/i18n/index.mjs');
  context.after(() => i18n.setLocale(i18n.DEFAULT_LOCALE));
  i18n.setLocale('zh-CN');
  const turn = planTurn();
  turn.step('item/completed', { threadId: 'P', turnId: 't1', item: user('u2', 't1') });
  const html = mount(hostFor(turn.state, turn.marks), { latestPromptId: 'u2' });
  assert.equal(count(html, '上一条消息之前的计划'), 1);
  for (const [key, value] of [
    ['{count, plural, one {# earlier step} other {# earlier steps}}', '前面还有 3 步'],
    ['{count, plural, one {# more to go} other {# more to go}}', '还剩 3 步'],
    ['{count, plural, one {# running task} other {# running tasks}}', '3 个任务正在运行'],
  ]) assert.equal(renderToStaticMarkup(React.createElement(A.FormattedMessage, { id: 'x', defaultMessage: key, values: { count: 3 } })), value);
  assert.equal(renderToStaticMarkup(React.createElement(A.FormattedMessage, { id: 'x', defaultMessage: 'Open session {name} ({state})', values: { name: 'A', state: '已完成' } })), '打开会话 A（已完成）');
  assert.match(i18n.t('Claude is waiting on you. Pick a reply or type your own.'), /^Claude /);
});

// ---- R4g review fix: main.jsx's own wiring, rendered at App level ----
// The App's declarations (items / running, approvalOwner, approvals, shownApprovals, the turnBox* hooks) and the two
// JSX elements (the slot among SourceTranscript's children, the region before the composer) are read out of main.jsx
// as written and evaluated over a real state.js state, in one long-lived client root (a small DOM), so refs, effects and
// the plan observer run as in the App: the slot's ref publishes it, the probe makes the box placeable, and the box
// portals into the transcript tail slot.
const mainSource = fs.readFileSync(path.join(app, 'src/main.jsx'), 'utf8');
const mainText = (node) => mainSource.slice(node.start, node.end);
function findAll(node, predicate, out = []) {
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node)) { for (const child of node) findAll(child, predicate, out); return out; }
  if (typeof node.type === 'string' && predicate(node)) out.push(node);
  for (const key of Object.keys(node)) if (key !== 'parent') findAll(node[key], predicate, out);
  return out;
}
const APP_NAMES = ['items', 'running', 'approvalOwner', 'approvals', 'shownApprovals', 'turnBoxSession', 'turnBoxScope', 'turnBoxPlanMarks', 'turnBoxHost', 'turnBoxComposer'];
async function compileAppTurnBox() {
  const { parseAst } = await import('rolldown/parseAst');
  const ast = parseAst(mainSource, { lang: 'jsx' }, 'src/main.jsx');
  const [appFn] = findAll(ast, (n) => n.type === 'FunctionDeclaration' && n.id?.name === 'App');
  assert.ok(appFn, 'main.jsx App');
  // App's own top-level declarators, in source order (inner functions declare their own `items` / `running`).
  const declarators = appFn.body.body.filter((s) => s.type === 'VariableDeclaration').flatMap((s) => s.declarations)
    .filter((d) => d.id.type === 'Identifier' && APP_NAMES.includes(d.id.name));
  assert.deepEqual(declarators.map((d) => d.id.name).sort(), [...APP_NAMES].sort(), 'each declared once at App level');
  const element = (name) => {
    const found = findAll(appFn, (n) => n.type === 'LogicalExpression' && n.operator === '&&' && n.right.type === 'JSXElement'
      && n.right.openingElement.name.name === name);
    assert.equal(found.length, 1, name);
    const { left, right } = found[0];
    assert.equal(right.children.length, 0, `${name} has no children`);
    const props = right.openingElement.attributes.map((a) => (a.type === 'JSXSpreadAttribute' ? `...(${mainText(a.argument)})`
      : `${JSON.stringify(a.name.name)}: ${a.value.type === 'JSXExpressionContainer' ? mainText(a.value.expression) : JSON.stringify(a.value.value)}`));
    return { guard: mainText(left), call: `React.createElement(${name}, { ${props.join(', ')} })`, start: found[0].start };
  };
  const slot = element('SourceTurnBoxSlot'), region = element('SourceTurnBoxRegion');
  const body = [...declarators.map((d) => `const ${mainText(d)};`),
    `return { slot: (${slot.guard}) && ${slot.call}, region: (${region.guard}) && ${region.call} };`].join('\n');
  // Sloppy-mode `with`: every free name of those expressions comes from the App scope handed in, and a name the
  // fixture does not provide throws instead of reading a global.
  const scope = new Function('env', `with (env) {\n${body}\n}`);
  return { scope, body, slotStart: slot.start, regionStart: region.start };
}

function clientDom() {
  const document = { nodeType: 9, nodeName: '#document', activeElement: null, addEventListener() {}, removeEventListener() {} };
  class Node {
    constructor(tag, ns = 'http://www.w3.org/1999/xhtml') {
      Object.assign(this, { tagName: tag.toUpperCase(), nodeName: tag.toUpperCase(), localName: tag, nodeType: 1, namespaceURI: ns, ownerDocument: document,
        childNodes: [], parentNode: null, attributes: new Map(),
        style: { setProperty(k, v) { this[k] = v; }, removeProperty(k) { delete this[k]; } } });
    }
    get firstChild() { return this.childNodes[0] ?? null; }
    get nextSibling() { const list = this.parentNode?.childNodes ?? []; return list[list.indexOf(this) + 1] ?? null; }
    set textContent(value) { this.childNodes = value ? [document.createTextNode(value)] : []; }
    get textContent() { return this.childNodes.map((n) => (n.nodeType === 3 ? n.nodeValue : n.textContent) ?? '').join(''); }
    setAttribute(name, value) { this.attributes.set(name, String(value)); }
    setAttributeNS(_ns, name, value) { this.attributes.set(name, String(value)); }
    getAttribute(name) { return this.attributes.has(name) ? this.attributes.get(name) : null; }
    hasAttribute(name) { return this.attributes.has(name); }
    removeAttribute(name) { this.attributes.delete(name); }
    appendChild(child) { child.parentNode?.removeChild(child); this.childNodes.push(child); child.parentNode = this; return child; }
    insertBefore(child, ref) { child.parentNode?.removeChild(child); const i = ref ? this.childNodes.indexOf(ref) : -1; if (i < 0) this.childNodes.push(child); else this.childNodes.splice(i, 0, child); child.parentNode = this; return child; }
    removeChild(child) { const i = this.childNodes.indexOf(child); if (i >= 0) this.childNodes.splice(i, 1); child.parentNode = null; return child; }
    contains(other) { for (let n = other; n; n = n.parentNode) if (n === this) return true; return false; }
    addEventListener() {} removeEventListener() {}
    getBoundingClientRect() { return { x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 }; }
  }
  Object.assign(document, {
    createElement: (tag) => new Node(tag), createElementNS: (ns, tag) => new Node(tag, ns),
    createTextNode: (text) => ({ nodeType: 3, nodeName: '#text', nodeValue: text, get textContent() { return this.nodeValue; }, ownerDocument: document, parentNode: null }),
    createComment: (text) => ({ nodeType: 8, nodeName: '#comment', nodeValue: text, textContent: '', ownerDocument: document, parentNode: null }),
  });
  document.body = new Node('body');
  document.documentElement = new Node('html');
  class ResizeObserver { observe() {} unobserve() {} disconnect() {} }
  const window = { document, HTMLIFrameElement: class {}, ResizeObserver, setTimeout, clearTimeout, requestAnimationFrame: (fn) => setTimeout(fn, 0),
    cancelAnimationFrame: clearTimeout, getComputedStyle: () => ({ getPropertyValue: () => '' }), matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) };
  document.defaultView = window;
  const escape = (value) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const html = (node) => (node.nodeType === 3 ? escape(node.nodeValue) : node.nodeType !== 1 ? ''
    : `<${node.localName}${[...node.attributes].map(([k, v]) => ` ${k}="${escape(v)}"`).join('')}>${node.childNodes.map(html).join('')}</${node.localName}>`);
  return { document, window, Node, html };
}

test('R4g review: main.jsx\'s App wiring over the reducer — the box shows on a plan update, not while a plan review is pending', async () => {
  const { act } = React;
  const { createRoot } = await import('react-dom/client');
  const Approvals = await server.ssrLoadModule('/src/approval-draft-model.mjs');
  const State = await server.ssrLoadModule('/src/state.js');
  const { scope: appScope, body } = await compileAppTurnBox();
  // The expressions the finding names are the ones evaluated here.
  for (const piece of ['codeTurnBoxRegionProps({ items, running, shownApprovals, isPlanReview: isPlanReviewRequest, archived: session?.archived })',
    'useCodeTurnBoxHost({ state, planMarks: turnBoxPlanMarks, requestOwner: approvalOwner, currentId: current', 'codeTurnBoxSession(current, mode)',
    'state.items[current] || []', '!!state.active[current]', 'visibleApprovals(approvals)', 'ownerThreadId(state, approval.params?.threadId)'])
    assert.equal(count(body, piece), 1, piece);
  const navigated = [];
  // App's scope: the module functions main.jsx imports, React's hooks, and inert stand-ins for the App callbacks the
  // box only calls on a click (none here).
  const env = (state, current, mode, session = null) => ({
    state, current, mode, React, useMemo: React.useMemo,
    useTurnBoxScope: M.useTurnBoxScope, useTurnBoxPlanMarks: M.useTurnBoxPlanMarks, useCodeTurnBoxHost: M.useCodeTurnBoxHost,
    useTurnBoxComposerHandle: M.useTurnBoxComposerHandle, codeTurnBoxSession: M.codeTurnBoxSession, codeTurnBoxRegionProps: M.codeTurnBoxRegionProps,
    SourceTurnBoxSlot: M.SourceTurnBoxSlot, SourceTurnBoxRegion: M.SourceTurnBoxRegion,
    ownerThreadId: State.ownerThreadId, visibleApprovals: Approvals.visibleApprovals, isPlanReviewRequest: Approvals.isPlanReviewRequest,
    sessions: [], navigate: (id) => navigated.push(id), sessionAction: async () => {}, actionFailed: () => () => {},
    session, section: 'session', openPanes: new Set(), openPaneTile: () => {},
    textarea: { current: null }, liveComposer: { current: null }, draft: '', setDraft: () => {}, shellModeActive: () => false, boot: null, shellOptions: null,
    cardComposerDraft: { current: false }, attachments: [],
  });
  function AppTurnBox({ state, current, mode, session }) {
    const { slot, region } = appScope(env(state, current, mode, session));
    // SourceTranscript's tail children hold the slot; the region renders after the transcript, before the composer.
    return React.createElement('main', null, React.createElement('section', { 'data-transcript': '' }, slot || null),
      React.createElement('footer', { 'data-composer-region': '' }, region || null));
  }
  const dom = clientDom();
  const saved = ['window', 'document', 'requestAnimationFrame', 'cancelAnimationFrame', 'ResizeObserver', 'IS_REACT_ACT_ENVIRONMENT']
    .map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)]);
  const define = (name, value) => Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
  define('IS_REACT_ACT_ENVIRONMENT', true);
  define('window', dom.window); define('document', dom.document);
  define('requestAnimationFrame', dom.window.requestAnimationFrame); define('cancelAnimationFrame', dom.window.cancelAnimationFrame);
  define('ResizeObserver', dom.window.ResizeObserver);
  const container = dom.document.body.appendChild(new dom.Node('div'));
  const root = createRoot(container);
  const render = async (state, current = 'P', mode = 'code', session = null) => { await act(async () => { root.render(React.createElement(AppTurnBox, { state, current, mode, session })); }); };
  const findNode = (node, attr) => (node.attributes?.has?.(attr) ? node : node.childNodes?.map((c) => findNode(c, attr)).find(Boolean) ?? null);
  const planReview = (threadId) => ({ id: 7, bridgeApproval: { connectionId: 'c', instanceId: 'i' }, method: 'item/tool/requestUserInput',
    params: { threadId, turnId: 't1', itemId: 'call-plan', questions: [{ id: 'plan-review', header: 'Plan review', question: 'Approve this plan?', isOther: true,
      isSecret: false, options: [{ label: 'Approve', description: '' }, { label: 'Keep planning', description: '' }] }] } });
  try {
    // The App is up before the turn: no plan yet, so no card (the next-step row alone, hidden while nothing settles).
    let state = emptyState;
    await render(state);
    const transcriptSlot = () => findNode(container, 'data-inline-approval-slot');
    assert.ok(transcriptSlot(), 'the slot renders among the transcript children');
    assert.equal(transcriptSlot().parentNode.getAttribute('data-transcript'), '');
    // Events through the real reducer, one render each as the App does.
    for (const [method, params] of [['turn/started', { threadId: 'P', turn: { id: 't1' } }],
      ['item/completed', { threadId: 'P', turnId: 't1', item: user('u1', 't1') }],
      ['turn/plan/updated', { threadId: 'P', turnId: 't1', explanation: null, plan: steps }],
      ['item/completed', { threadId: 'P', turnId: 't1', item: planCall('plan-call-1', 't1') }]]) {
      state = apply(state, method, params);
      await render(state);
    }
    const slotHtml = dom.html(transcriptSlot());
    // DT (TurnBoxTodos) with the three steps, live (not the stale "before your last message" card), portalled into the slot.
    assert.equal(count(slotHtml, DT_CLASS.replace(/&/g, '&amp;').replace(/>/g, '&gt;')), 1, 'DT renders in the transcript tail slot');
    for (const text of ['Read the code', 'Fix the bug', 'Run the tests']) assert.equal(count(slotHtml, text), 1, text);
    assert.equal(count(slotHtml, 'Plan from before your last message'), 0);
    assert.equal(count(slotHtml, 'data-turn-next=""'), 1);
    // The composer region keeps only O5's probe.
    assert.equal(dom.html(findNode(container, 'data-composer-region')), '<footer data-composer-region=""><span hidden=""></span></footer>');
    // A plan review for this session (the host's ExitPlanMode): tn / MM take the box away.
    await render({ ...state, approvals: [planReview('P')] });
    assert.equal(dom.html(transcriptSlot()), '<div data-inline-approval-slot=""></div>', 'no box while the plan review is pending');
    // A sub-agent's plan review is the session's too (approvalOwner walks threadParents).
    await render({ ...state, threadParents: { child: 'P' }, approvals: [planReview('child')] });
    assert.equal(dom.html(transcriptSlot()), '<div data-inline-approval-slot=""></div>', 'a child thread\'s plan review counts');
    // Another session's plan review is filtered out of this App's approvals: the box stays.
    await render({ ...state, approvals: [planReview('Q')] });
    assert.equal(count(dom.html(transcriptSlot()), 'Fix the bug'), 1, 'another session\'s plan review does not hide it');
    // A steer inside the running turn: the latest prompt id comes from items, so the card turns stale.
    state = apply(state, 'item/completed', { threadId: 'P', turnId: 't1', item: user('u2', 't1') });
    await render(state);
    assert.equal(count(dom.html(transcriptSlot()), 'Plan from before your last message'), 1);
    // R4i-transcript TR1: an archived session is read only (NM isArchived → Mte isReadOnly): the slot stays, the box goes, as
    // the session rail turns read only for the same session.
    await render(state, 'P', 'code', { id: 'P', archived: true });
    assert.equal(dom.html(transcriptSlot()), '<div data-inline-approval-slot=""></div>', 'no box in an archived session');
    assert.equal(dom.html(findNode(container, 'data-composer-region')), '<footer data-composer-region=""><span hidden=""></span></footer>');
    await render(state, 'P', 'code', { id: 'P', archived: false });
    assert.equal(count(dom.html(transcriptSlot()), 'Plan from before your last message'), 1, 'unarchived: the box is back');
    // Not a Code session view: no slot and no region at all.
    await render(state, 'P', 'cowork');
    assert.equal(findNode(container, 'data-inline-approval-slot'), null);
    assert.equal(dom.html(findNode(container, 'data-composer-region')), '<footer data-composer-region=""></footer>');
    assert.deepEqual(navigated, []);
  } finally {
    await act(async () => root.unmount());
    for (const [name, descriptor] of saved) { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else delete globalThis[name]; }
  }
});
