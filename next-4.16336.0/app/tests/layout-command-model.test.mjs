import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { runLayoutCommand, layoutSnapshot, callerPosition, OUTCOMES } from '../src/layout-command-model.mjs';
import { tools, targetSession, group } from '../electron/agent-tools/window.mjs';

// B27 agent window-layout commands (c2189a16b runLayoutCommand F/I/L/R/B/A).
const base = { primary: 'me', panes: [], focused: 0, popout: false, windowHidden: false, sidebarCollapsed: false, dialogOpen: false, typing: false, hasRoom: true, openedBy: {}, popoutSessionIds: [], otherPopoutCount: 0 };
const run = (kind, extra = {}, snapshot = {}) => runLayoutCommand({ kind, callerSessionId: 'me', ...extra }, { ...base, ...snapshot });

test('the caller must be on screen; pane and sidebar commands need a full window; a dialog blocks', () => {
  assert.deepEqual(run('open-in-split', { targetSessionId: 'x' }, { primary: 'other' }).result, { outcome: 'refused', reason: 'caller_not_visible' });
  assert.deepEqual(run('open-in-split', { targetSessionId: 'x' }, { windowHidden: true }).result, { outcome: 'refused', reason: 'window_hidden' });
  assert.deepEqual(run('open-in-split', { targetSessionId: 'x' }, { popout: true }).result, { outcome: 'refused', reason: 'popout_has_no_panes' });
  assert.deepEqual(run('set-sidebar-collapsed', { collapsed: true }, { popout: true }).result, { outcome: 'refused', reason: 'popout_has_no_sidebar' });
  assert.equal(run('open-in-window', { targetSessionId: 'me' }, { popout: true }).result.outcome, OUTCOMES.DONE, 'a popout may open another window');
  assert.deepEqual(run('focus', { targetSessionId: 'me' }, { dialogOpen: true }).result, { outcome: 'refused', reason: 'dialog_open' });
  assert.equal(run('get-layout').result.outcome, 'done');
  assert.deepEqual(run('nope').result, { outcome: 'failed', reason: 'unknown_command' });
});

test('open in split / window / focus', () => {
  assert.deepEqual(run('open-in-split', { targetSessionId: 'me' }).result, { outcome: 'noop', reason: 'already_in_primary' });
  assert.deepEqual(run('open-in-split', { targetSessionId: 'b' }, { panes: [{ key: 1, sessionId: 'b', col: 1, row: 0 }] }).result, { outcome: 'noop', reason: 'already_in_pane' });
  assert.deepEqual(run('open-in-split', { targetSessionId: 'b' }, { hasRoom: false }).result, { outcome: 'refused', reason: 'no_room' });
  assert.deepEqual(run('open-in-split', { targetSessionId: 'b' }, { focused: 0 }), { result: { outcome: 'done' }, effect: { kind: 'open-split', sessionId: 'b', keepFocus: 0 } });
  assert.deepEqual(run('open-in-split').result, { outcome: 'failed', reason: 'missing_target' });
  assert.deepEqual(run('open-in-window', { targetSessionId: 'me' }, { popoutSessionIds: ['me'] }).result, { outcome: 'noop', reason: 'already_in_window' });
  assert.deepEqual(run('open-in-window', { targetSessionId: 'me' }).effect, { kind: 'open-window', sessionId: 'me' });
  const split = { panes: [{ key: 4, sessionId: 'me', col: 1, row: 0 }], primary: 'a', focused: 0 };
  assert.deepEqual(run('focus', { targetSessionId: 'me' }, split), { result: { outcome: 'done', reason: 'focused_pane', paneIndex: 1 }, effect: { kind: 'focus', index: 1 } });
  assert.deepEqual(run('focus', { targetSessionId: 'me' }, { ...split, focused: 1 }).result, { outcome: 'noop', reason: 'already_in_pane' });
  assert.deepEqual(run('focus', { targetSessionId: 'me' }, { ...split, typing: true }).result, { outcome: 'refused', reason: 'user_typing' });
  assert.deepEqual(run('focus', { targetSessionId: 'me' }).result, { outcome: 'noop', reason: 'already_in_primary' });
  assert.deepEqual(run('focus', { targetSessionId: 'z' }), { result: { outcome: 'done', reason: 'replaced_caller' }, effect: { kind: 'navigate', sessionId: 'z' } });
});

test('close split only closes panes the caller opened, never one the user is in; the sidebar', () => {
  const panes = [{ key: 1, sessionId: 'b', col: 1, row: 0 }, { key: 2, sessionId: 'c', col: 1, row: 1 }];
  assert.deepEqual(run('close-split', {}, { panes }).result, { outcome: 'noop', reason: 'no_split_to_close' });
  assert.deepEqual(run('close-split', { targetSessionId: 'b' }, { panes }).result, { outcome: 'refused', reason: 'not_opened_by_you' });
  assert.deepEqual(run('close-split', {}, { panes, openedBy: { 1: 'me', 2: 'me' } }), { result: { outcome: 'done', paneIndex: 2 }, effect: { kind: 'close', index: 2 } });
  assert.deepEqual(run('close-split', { targetSessionId: 'b' }, { panes, openedBy: { 1: 'me' }, focusedPane: 1 }).result, { outcome: 'refused', reason: 'pane_in_use' });
  assert.deepEqual(run('set-sidebar-collapsed', { collapsed: false }).result, { outcome: 'noop', reason: 'already_expanded' });
  assert.deepEqual(run('set-sidebar-collapsed', { collapsed: true }, { sidebarFocused: true }).result, { outcome: 'refused', reason: 'sidebar_in_use' });
  assert.deepEqual(run('set-sidebar-collapsed', { collapsed: false }, { sidebarCollapsed: true, sidebarConstrained: true }).result, { outcome: 'refused', reason: 'sidebar_constrained' });
  assert.deepEqual(run('set-sidebar-collapsed', { collapsed: true }).effect, { kind: 'sidebar', collapsed: true });
});

test('the layout the agent reads (c2189a16b A)', () => {
  const layout = layoutSnapshot({ ...base, primary: 'a', focused: 2, panes: [{ key: 1, sessionId: 'me', col: 1, row: 0 }, { key: 2, sessionId: null, col: 1, row: 1 }], popoutSessionIds: ['p'], otherPopoutCount: 2 }, 'me');
  assert.deepEqual(layout, { mode: 'code', sidebarCollapsed: false, primarySessionId: 'a', primaryFocused: false,
    panes: [{ index: 1, col: 1, row: 0, kind: 'session', sessionId: 'me', focused: false }, { index: 2, col: 1, row: 1, kind: 'draft', focused: true }],
    popoutSessionIds: ['p'], otherPopoutCount: 2, caller: { primary: false, paneIndex: 1, popout: false } });
  assert.equal(callerPosition({ ...base, popout: true }, 'me').inMainWindow, false);
  assert.equal(layoutSnapshot({ ...base, popout: true }, 'me').caller.popout, true);
});

test('agent tools: the ccd_window set, acting on the calling session only', async () => {
  assert.equal(group, 'window');
  assert.deepEqual(tools.map((tool) => tool.name), ['get_window_layout', 'open_session_in', 'close_split', 'set_sidebar_collapsed']);
  assert.equal(targetSession('self', 's1'), 's1');
  assert.equal(targetSession('s1', 's1'), 's1');
  assert.throws(() => targetSession('other', 's1'), /only arrange this session/);
  const calls = [];
  const ctx = { sessionId: 's1', layout: { run: async (command) => { calls.push(command); return { outcome: 'done', layout: { mode: 'code' } }; } } };
  const open = tools.find((tool) => tool.name === 'open_session_in');
  const text = await open.handler({ session_id: 'self', target: 'window' }, ctx);
  assert.deepEqual(JSON.parse(text), { outcome: 'done', layout: { mode: 'code' } });
  await tools.find((tool) => tool.name === 'close_split').handler({}, ctx);
  await tools.find((tool) => tool.name === 'set_sidebar_collapsed').handler({ collapsed: true }, ctx);
  assert.deepEqual(calls, [{ kind: 'open-in-window', targetSessionId: 's1' }, { kind: 'close-split' }, { kind: 'set-sidebar-collapsed', collapsed: true }]);
  await assert.rejects(open.handler({ session_id: 'self', target: 'tab' }, ctx), /target must be/);
  const main = fs.readFileSync(path.resolve(import.meta.dirname, '../electron/main.cjs'), 'utf8');
  assert.match(main, /agentTools\.provide\("layout", \(session\) => \(\{ run: \(command\) => runAgentLayoutCommand\(session\.id, command\) \}\)\);/);
  assert.match(main, /await openSessionPopout\(\{ sessionId: target, from: pending\.window, inactive: true \}\);/);
  assert.match(main, /return defer \? \["workflow", "monitor", "schedule", "findings", "notebook", "window", "browser"\] : \[\];/);
});
