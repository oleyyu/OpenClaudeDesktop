// turn-plan: the ccd_turn calls in the transcript become the task list card, the next-step box and the settled receipts.
// The host items go through turnMessages() into the original c1ebb1aa4 Rt / Ft (generated/turn-plan/turn-tail.mjs); the
// Code turn box (source-turn-box.jsx, generated cccc2cf0a CT / DT / hT) and the settled receipt (generated c96d752d0
// Itt over cb6930dae's question receipt) render under SSR with the official DOM. The real state.js reducer drives the
// items. No browser, no DOM, no network, no port (Vite in middleware mode with hmr / ws off), no real session.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { emptyState, reduce } from '../src/state.js';
import { codeTurnTail, promptRowOf, settledWrapUps, toolArgs, turnMessages, turnToolOf, withTurnBoxRows } from '../src/turn-plan-model.mjs';

const app = path.resolve(import.meta.dirname, '..');
const count = (text, needle) => text.split(needle).length - 1;
let server, M, A, S;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  M = await server.ssrLoadModule('/src/source-turn-box.jsx');
  A = await server.ssrLoadModule('/src/source-turn-box-adapters.jsx');
  S = await server.ssrLoadModule('/src/source-settled-turn-box.jsx');
});
after(async () => { await server?.close(); });

const event = (method, params) => ({ kind: 'notification', method, params });
const apply = (state, method, params) => reduce(state, { event: event(method, params) });
const user = (id, turnId, text = id) => ({ id, type: 'userMessage', turnId, content: [{ type: 'text', text }] });
const call = (id, tool, args, extra = {}) => ({ id, type: 'mcpToolCall', server: 'code_desktop', tool, arguments: args, status: 'completed',
  result: { content: [{ type: 'text', text: 'ok' }] }, ...extra });
const PLAN = [{ content: 'Read the code', status: 'in_progress' }, { content: 'Fix the bug', status: 'pending' }, { content: 'Run the tests', status: 'pending' }];
const WRAP = { recap: 'Fixed the bug. Nothing committed yet.', ask: 'Commit the fix?', actions: [{ label: 'Yes, commit', message: 'Commit the fix now' }] };

function session() {
  let state = emptyState;
  const step = (method, params) => { state = apply(state, method, params); return state; };
  step('turn/started', { threadId: 'P', turn: { id: 't1' } });
  step('item/completed', { threadId: 'P', turnId: 't1', item: user('u1', 't1') });
  return { get state() { return state; }, step };
}
const item = (s, value) => s.step('item/completed', { threadId: 'P', turnId: 't1', item: value });
function hostFor(state, extra = {}) {
  let host = null;
  function Probe() { host = M.useCodeTurnBoxHost({ state, planMarks: {}, currentId: 'P', requestOwner: (r) => r.params.threadId, ...extra }); return null; }
  renderToStaticMarkup(React.createElement(Probe));
  return host;
}
const ref = { id: 'P', type: 'local' };
const mount = (state, props = {}, extra = {}) => {
  const host = hostFor(state, extra);
  return renderToStaticMarkup(React.createElement(A.TurnBoxHost.Provider, { value: host },
    React.createElement(M.SourceTurnBoxMount, { host, scope: M.createTurnBoxScope(), placement: { slotEl: null, placeable: true },
      sessionRef: ref, isResponding: !!state.active.P, latestPromptId: 'u1', composerRef: { current: null }, hasComposerDraft: () => false, ...props })));
};

test('turnToolOf / toolArgs: the code_desktop server, OpenCode prefixes, a JSON string input', () => {
  assert.equal(turnToolOf(call('a', 'update_plan', {})), 'update_plan');
  assert.equal(turnToolOf(call('a', 'wrap_up', {})), 'wrap_up');
  assert.equal(turnToolOf({ type: 'dynamicToolCall', tool: 'code_desktop_wrap_up' }), 'wrap_up');
  assert.equal(turnToolOf({ type: 'dynamicToolCall', name: 'mcp__code_desktop__update_plan' }), 'update_plan');
  assert.equal(turnToolOf({ type: 'mcpToolCall', server: 'other', tool: 'update_plan' }), null);
  assert.equal(turnToolOf({ type: 'mcpToolCall', server: 'code_desktop', tool: 'mark_chapter' }), null);
  assert.deepEqual(toolArgs({ arguments: '{"advance":true}' }), { advance: true });
});

test('turnMessages: the host items as the SDK messages Rt reads (official tool names, results, turn ends)', () => {
  const items = [user('u1', 't1'), call('c1', 'update_plan', { items: PLAN, scope: 'first_task' }, { turnId: 't1' }),
    { id: 'm1', type: 'agentMessage', text: 'ok', turnId: 't1' }, call('c2', 'update_plan', { advance: true }, { turnId: 't1', status: 'failed', result: { isError: true, content: [] } }),
    user('u2', 't2'), { id: 'x', type: 'commandExecution', status: 'inProgress', turnId: 't2' }];
  const { messages } = turnMessages(items, { activeTurnId: 't2' });
  assert.deepEqual(messages.map((m) => m.type), ['user', 'assistant', 'user', 'assistant', 'assistant', 'user', 'result', 'user', 'assistant']);
  assert.equal(messages[1].message.content[0].name, 'mcp__ccd_turn__update_plan');
  assert.equal(messages[4].message.content[0].name, 'mcp__ccd_turn__update_plan');
  assert.equal(messages[5].message.content[0].is_error, true);
  assert.deepEqual([messages[6].subtype, messages[6].uuid], ['success', 'result:t1']);
  assert.equal(turnMessages(items, { activeTurnId: null, turnErrors: { t2: { message: 'x' } } }).messages.at(-1).subtype, 'error_during_execution');
});

test('codeTurnTail (official Rt): plan, advance, wrap_up checks every step off and keeps the list, Mt completes the last step', () => {
  const base = [user('u1', 't1'), call('c1', 'update_plan', { items: PLAN, scope: 'first_task' }, { turnId: 't1' }),
    call('c2', 'update_plan', { done: [1, 2], start: 3 }, { turnId: 't1' })];
  const running = codeTurnTail({ items: base, latestPromptId: 'u1', activeTurnId: 't1' });
  assert.deepEqual(running.plan.map((t) => [t.id, t.content, t.status]), [['plan-0', 'Read the code', 'completed'], ['plan-1', 'Fix the bug', 'completed'], ['plan-2', 'Run the tests', 'in_progress']]);
  assert.equal(running.planTouchedThisTurn, true);
  assert.equal(running.wrapUp, null);
  // The turn ended cleanly with only the last step open: Mt completes it.
  const ended = codeTurnTail({ items: base, latestPromptId: 'u1', activeTurnId: null });
  assert.deepEqual(ended.plan.map((t) => t.status), ['completed', 'completed', 'completed']);
  assert.equal(ended.turnSettled, true);
  assert.equal(ended.workedWithoutWrapUp, false, 'only update_plan calls: no work (C)');
  const worked = codeTurnTail({ items: [...base, { id: 'x', type: 'commandExecution', status: 'completed', turnId: 't1' }], latestPromptId: 'u1', activeTurnId: null });
  assert.equal(worked.workedWithoutWrapUp, true);
  // A failed turn keeps it open.
  assert.deepEqual(codeTurnTail({ items: base, latestPromptId: 'u1', activeTurnId: null, turnErrors: { t1: { message: 'x' } } }).plan.map((t) => t.status), ['completed', 'completed', 'in_progress']);
  // wrap_up: every step checked off, the list before kept, the box's wrapUp parsed.
  const wrapped = [...base.slice(0, 2), call('w1', 'wrap_up', WRAP, { turnId: 't1' })];
  const tail = codeTurnTail({ items: wrapped, latestPromptId: 'u1', activeTurnId: 't1' });
  assert.deepEqual(tail.plan.map((t) => t.status), ['completed', 'completed', 'completed']);
  assert.deepEqual(tail.planBeforeWrapUp.map((t) => t.status), ['in_progress', 'pending', 'pending']);
  assert.deepEqual(tail.wrapUp, { recap: WRAP.recap, blocked: false, next: { ask: 'Commit the fix?', actions: [{ kind: 'send', label: 'Yes, commit', message: 'Commit the fix now' }] } });
  assert.equal(tail.wrapUpCallId, 'w1');
  assert.deepEqual(tail.wrapUpReceipt, tail.wrapUp);
  assert.equal(tail.workedWithoutWrapUp, false);
  // A failed wrap_up is not the box's.
  assert.equal(codeTurnTail({ items: [...base.slice(0, 2), call('w1', 'wrap_up', WRAP, { turnId: 't1', status: 'failed', result: { isError: true, content: [] } })], latestPromptId: 'u1', activeTurnId: 't1' }).wrapUp, null);
  // A native plan (turn/plan/updated) is not the box's: the update_plan branch reads the ccd_turn calls only.
  assert.equal(codeTurnTail({ items: [user('u1', 't1')], latestPromptId: 'u1', activeTurnId: 't1' }).plan, null);
});

test('settledWrapUps (Ft / It / Lt) and withTurnBoxRows: receipts before the prompt that answered them, ccd_turn rows dropped', () => {
  const items = [user('u1', 't1'), call('c1', 'update_plan', { items: PLAN, scope: 'first_task' }, { turnId: 't1' }), call('w1', 'wrap_up', WRAP, { turnId: 't1' }),
    user('u2', 't2', 'Commit the fix now'), call('w2', 'wrap_up', { outcome: 'Old style outcome.' }, { turnId: 't2' })];
  const settled = settledWrapUps(items, { activeTurnId: 't2' });
  assert.deepEqual([...settled.keys()], ['u2']);
  assert.equal(settledWrapUps(items, { activeTurnId: 't2', dismissed: new Set(['w1']) }).size, 0, 'a dismissed wrap-up has no receipt');
  const rows = withTurnBoxRows(items, settled);
  assert.deepEqual(rows.map((r) => r.id), ['u1', 'turn-box-u2', 'u2', 'w2-wrap']);
  assert.deepEqual(rows[1].settledTurnBox.promptRow, promptRowOf(items[3]));
  assert.deepEqual(rows[3], { id: 'w2-wrap', type: 'agentMessage', text: 'Old style outcome.', turnId: 't2' }, 'an old-style outcome call shows as text (Vr)');
  const none = [user('u1', 't1')];
  assert.equal(withTurnBoxRows(none, new Map()), none);
});

test('the card: the turn box draws the plan with the official DOM for completed, in_progress and pending steps', () => {
  const s = session();
  item(s, call('c1', 'update_plan', { items: PLAN, scope: 'first_task' }));
  item(s, call('c2', 'update_plan', { advance: true }));
  const html = mount(s.state);
  assert.equal(count(html, 'epitaxy-root motion-safe:animate-fade-in text-body text-primary break-words overflow-clip rounded-card shadow-[inset_0_0_0_1px_var(--cds-ring-color)]'), 1);
  assert.equal(count(html, '<li'), 3);
  const [completed, inProgress, pending] = html.split('<li').slice(1);
  assert.ok(completed.includes(String.fromCodePoint(57405)) && completed.includes('>done</span>'), 'CheckCircleFilled');
  assert.ok(inProgress.includes('data-cds="Spinner"') && inProgress.includes('>in progress</span>'));
  assert.ok(pending.includes(String.fromCodePoint(57536)) && pending.includes('text-muted-as-secondary') && pending.includes('>not done</span>'), 'Placeholder');
  // A native turn/plan/updated alone draws no card now (the official update_plan branch).
  const native = session();
  native.step('turn/plan/updated', { threadId: 'P', turnId: 't1', explanation: null, plan: [{ step: 'x', status: 'inProgress' }] });
  assert.equal(count(mount(native.state), '<li'), 0);
});

test('the next-step box: recap, question and the reply button after wrap_up; the plan card gives way to it', () => {
  const s = session();
  item(s, call('c1', 'update_plan', { items: PLAN, scope: 'first_task' }));
  item(s, call('w1', 'wrap_up', WRAP));
  s.step('turn/completed', { threadId: 'P', turn: { id: 't1', status: 'completed' } });
  const html = mount(s.state, { isResponding: false });
  assert.ok(html.includes('data-turn-next=""'));
  assert.equal(count(html, WRAP.recap), 1, 'the recap');
  assert.equal(count(html, 'Commit the fix?'), 1, 'the question');
  assert.equal(count(html, 'Yes, commit'), 1, 'the reply button');
  // z$ draws the row only with its group label (secret:hlf4y0, not in any installed catalog): the host names it.
  assert.equal(count(html, 'role="group" aria-label="Suggested next steps"'), 1);
  assert.ok(/<button[^>]*>(?:(?!<\/button>).)*Yes, commit/s.test(html), 'the reply is a button');
  assert.ok(html.includes('text-body text-secondary select-text break-words'), 'hT recap paragraph');
  assert.ok(html.includes('text-body text-primary select-text break-words'), 'hT question paragraph');
  // While the turn still runs the row is hidden (CT `_`).
  const runningHtml = mount(session().state);
  assert.equal(count(runningHtml, 'Yes, commit'), 0);
});

test('the reply button sends its message as the user\'s (TurnBoxHost.send → onSend), for the open session only', async () => {
  const sent = [];
  const host = hostFor(emptyState, { onSend: async (text) => { sent.push(text); return true; } });
  assert.equal(await host.send({ ref, text: 'Commit the fix now', uuid: 'x' }), true);
  assert.equal(await host.send({ ref: { id: 'other', type: 'local' }, text: 'no', uuid: 'y' }), false);
  assert.deepEqual(sent, ['Commit the fix now']);
  assert.equal(hostFor(emptyState).send, undefined, 'no sender, no send');
  // The chip a reply action becomes carries that message as its text (c227f4d5e xY).
  const { wrapUpSendChip } = await server.ssrLoadModule('/src/generated/turn-box/epitaxy-session.mjs');
  const chip = wrapUpSendChip({ kind: 'send', label: 'Yes, commit', message: 'Commit the fix now' }, 0);
  assert.equal(chip.kind, 'send');
  assert.equal(chip.source, 'model');
});

test('the settled receipt (c96d752d0 Itt): recap, question and the answer the user gave', () => {
  const items = [user('u1', 't1'), call('w1', 'wrap_up', WRAP, { turnId: 't1' }), user('u2', 't2', 'Commit the fix now')];
  const settled = settledWrapUps(items, { activeTurnId: 't2' });
  const row = withTurnBoxRows(items, settled).find((r) => r.settledTurnBox);
  const html = renderToStaticMarkup(React.createElement(S.SourceSettledTurnBox, row.settledTurnBox));
  assert.ok(html.includes('epitaxy-question-receipt epitaxy-card-outline'), html);
  assert.equal(count(html, WRAP.recap), 1);
  assert.equal(count(html, 'Commit the fix?'), 1);
  assert.equal(count(html, 'Yes, commit'), 1, 'the answer: the chip whose message is the prompt');
});

test('wiring: main.jsx drops ccd_turn rows, renders the settled receipts and gives the box a sender; state.js is untouched', () => {
  const main = fs.readFileSync(path.join(app, 'src/main.jsx'), 'utf8');
  assert.equal(count(main, 'import { withTurnBoxRows } from "./turn-plan-model.mjs";'), 1);
  assert.equal(count(main, 'const toolRuns = withWorkflowToolRuns(mode === "code" ? withTurnBoxRows(proposalItems, settledTurnBoxes) : proposalItems, workflows);'), 1);
  assert.equal(count(main, '<SourceSettledTurnBox {...item.settledTurnBox}/>'), 1);
  assert.equal(count(main, 'onSend: (text) => sendFixedTurn(text, [], { queueWhileRunning: true })'), 1);
  assert.equal(count(fs.readFileSync(path.join(app, 'src/state.js'), 'utf8'), 'turn-plan'), 0);
  const box = fs.readFileSync(path.join(app, 'src/source-turn-box.jsx'), 'utf8');
  assert.ok(box.indexOf('import "./turn-plan-bridge.mjs";') < box.indexOf('./generated/turn-box/turn-box.mjs'), 'the bridge is set before the generated box loads');
  assert.ok(box.includes('wrapUp={wrapUpShown(tail.wrapUp, scope.getState().turnHasPendingSuggestion === true)}'));
});

test('the LocalSessions bridge: setAvailableNextActions goes to the main process (desktop:call)', async () => {
  const calls = [];
  globalThis.window = { desktop: { call: async (action, params) => { calls.push([action, params]); return true; } } };
  try {
    const { localSessionsBridge } = await import('../src/turn-plan-bridge.mjs');
    assert.equal(globalThis['claude.web'].LocalSessions, localSessionsBridge);
    assert.equal(await localSessionsBridge.setAvailableNextActions('P', ['archive']), true);
    await localSessionsBridge.setAvailableNextActions('P', undefined);
    assert.deepEqual(calls, [['turn-plan:available-next-actions', { sessionId: 'P', actions: ['archive'] }], ['turn-plan:available-next-actions', { sessionId: 'P', actions: null }]]);
  } finally { delete globalThis.window; }
});
