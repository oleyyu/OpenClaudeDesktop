// W14-code r4 sidebar-new (fr4-07 / gates-r4-01 / r4pa-c06): the Code sidebar's session hover card, sliced from 3.6556.2
// (scripts/extract-sidebar-hover-card.mjs → generated/sidebar-hover-card) over the host's pending approvals.
//  1. the generator: --check, the roots verbatim, the lazy bodies static, every adapter pinned;
//  2. the model: the host's requests in the desktop's shapes (row data, request list, pending action);
//  3. SSR: the card's trigger is the row; the awaiting body draws the host approval card with Deny / Allow once, "Awaiting
//     input" for what it cannot show, the quick reply with nothing pending; QO's lane jO.
// The card itself (hover / focus, 400 ms / 500 ms delay, 200 ms close) opens only in a browser: GUI acceptance.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { createApprovalDraftRuntime } from '../src/approval-draft-model.mjs';
import { hoverCardPendingAction, hoverCardRequests, hoverCardTool, sidebarHoverCardData, sidebarHoverCardState } from '../src/sidebar-hover-card-model.mjs';
import { hostGrowthBookFlag } from '../src/host-growthbook.mjs';

const app = path.resolve(import.meta.dirname, '..');
const v3 = path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
const out = path.join(app, 'src/generated/sidebar-hover-card');
const read = file => fs.readFileSync(file, 'utf8');
const COMMAND = 'item/commandExecution/requestApproval';
// A request the bridge raised (bridgeApproval: the approval runtime tickets only those).
const command = (params, id = 1) => ({ id, method: COMMAND, bridgeApproval: { connectionId: 'c', instanceId: `h${id}` }, params: { threadId: 't', itemId: 'i', ...params } });

// ---- 1. the generator ---------------------------------------------------------------------------------------------
test('generator --check: the generated hover card is the extractor\'s current output', async () => {
  const { extractSidebarHoverCard } = await import('../scripts/extract-sidebar-hover-card.mjs');
  await extractSidebarHoverCard({ check: true });
});

test('the roots are the 3.6556.2 originals, verbatim; the lazy bodies are static slices', () => {
  const manifest = JSON.parse(read(path.join(out, 'manifest.json')));
  assert.equal(manifest.referenceVersion, '3.6556.2');
  const byTarget = Object.fromEntries(manifest.modules.map(m => [m.target, m]));
  assert.deepEqual(path.basename(byTarget['hover-card.mjs'].source), 'shared-20-mUr7IqZY.js');
  assert.deepEqual(path.basename(byTarget['awaiting-body.mjs'].source), 'ca0409d7c-D6PQXChO.js');
  assert.deepEqual(path.basename(byTarget['summary-tooltip-body.mjs'].source), 'c009a87a0-VX6z_ojB.js');
  const shared20 = read(path.join(v3, 'shared-20-mUr7IqZY.js'));
  assert.ok(shared20.includes('defaultMessage:"Quick reply and approval controls available",id:"ynFeEyepCq"'));
  assert.ok(shared20.includes('function DO(){return ve("__gb__1002481325")}'));
  assert.ok(read(path.join(v3, 'shared-22-Bwn3sJTG.js')).includes('Q=!ce.isArchived&&t.pendingPermissions>0'));
  const card = read(path.join(out, 'hover-card.mjs')), body = read(path.join(out, 'awaiting-body.mjs'));
  for (const needle of ['defaultMessage: "Quick reply and approval controls available"', 'Oe = l ? 400 : 500', 'closeDelay: 200,', 'interactive: Ee,',
    '"epitaxy-root break-words [--preview-card-min-w:440px] [--preview-card-max-w:440px] !px-0 !py-0"',
    '"epitaxy-root break-words [--preview-card-min-w:340px] [--preview-card-max-w:340px]"', 'return ve("__gb__1002481325");', 'lane: "live"'])
    assert.ok(card.includes(needle), needle);
  for (const needle of ['defaultMessage: "Awaiting input", id: "tM90hqjWj0"', 'defaultMessage: "Open the session to respond",',
    'defaultMessage: "Reply to Claude\\u2026"', 'defaultMessage: "Send reply"', '"Response couldn\'t be sent. You can try again."', 'hasThreadAllow: !1,'])
    assert.ok(body.includes(needle), needle);
  for (const text of [card, body]) assert.doesNotMatch(text, /\bimport\s*\(/, 'no dynamic import left: the bodies are static');
  assert.match(card, /AwaitingHoverCardBodySlice as FO/);
  assert.match(card, /SessionSummaryTooltipBodySlice as MO/);
  assert.match(body, /ToolApprovalHoverCard as fe/);
});

test('host table: 1002481325 is Uon always on; code_session_hover_card_main and the rollback switch', () => {
  const uon = read(path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/asar/.vite/build/index.chunk-jPKPzV-P.js'));
  assert.ok(uon.includes('1002481325:{rule:"always",value:!0}'));
  assert.ok(!uon.includes('3246128714:{'), 'code_session_hover_card_main is not in Uon (off on the 3P desktop)');
  assert.equal(hostGrowthBookFlag('__gb__1002481325'), true);
  assert.equal(hostGrowthBookFlag('code_session_hover_card_main'), false);
  assert.equal(hostGrowthBookFlag('claudeai_cc_epitaxy_session_presets_main'), true, 'QO w = x || C: the presets gate opens it');
  assert.equal(hostGrowthBookFlag('local_sidebar_hover_card'), true, 'rollback switch: on');
});

// ---- 2. the model ---------------------------------------------------------------------------------------------------
test('model: a plain command approval is Bash {command}; other requests keep their method (no inline decisions)', () => {
  assert.deepEqual(hoverCardTool(command({ command: 'npm test' })).toolName, 'Bash');
  assert.deepEqual(hoverCardTool(command({ command: 'npm test' })).input, { command: 'npm test' });
  assert.equal(hoverCardTool({ id: 2, method: 'item/fileChange/requestApproval', params: { threadId: 't' } }).toolName, 'item/fileChange/requestApproval');
  assert.equal(hoverCardTool({ id: 3, method: 'item/tool/requestUserInput', params: { threadId: 't' } }).toolName, 'AskUserQuestion');
  const [first] = hoverCardRequests([command({ command: 'ls' }, 9)]);
  assert.deepEqual([first.requestId, first.toolName, first.input, first.status, first.outOfTurn], ['9', 'Bash', { command: 'ls' }, 'pending', false]);
  assert.equal(hoverCardPendingAction([command({ command: 'ls' }, 9)]).tool_use_id, '9');
  const data = sidebarHoverCardData({ id: 's1' }, { requests: [command({ command: 'ls' }, 9)] });
  assert.deepEqual([data.id, data.type, data.pendingPermissions, data.sessionStatus, data._originalSession.external_metadata.pending_action.tool_name],
    ['s1', 'local', 1, 'requires_action', 'Bash']);
  assert.deepEqual(sidebarHoverCardState(data), { awaiting: true, disabled: false });
  assert.deepEqual(sidebarHoverCardState(sidebarHoverCardData({ id: 's1' }, { archived: true, requests: [command({})] })), { awaiting: false, disabled: true });
  assert.deepEqual(sidebarHoverCardState(sidebarHoverCardData({ id: 's2' })), { awaiting: false, disabled: true });
  assert.deepEqual(sidebarHoverCardState(data, { suspended: true }), { awaiting: true, disabled: true });
});

// ---- 3. SSR -----------------------------------------------------------------------------------------------------------
let server, Hover, Adapters, Body, Card;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  Hover = await server.ssrLoadModule('/src/source-sidebar-hover-card.jsx');
  Adapters = await server.ssrLoadModule('/src/source-sidebar-hover-card-adapters.jsx');
  Body = await server.ssrLoadModule('/src/generated/sidebar-hover-card/awaiting-body.mjs');
  Card = await server.ssrLoadModule('/src/generated/sidebar-hover-card/hover-card.mjs');
});
after(() => server?.close());

const hostOf = (requests, extra = {}) => {
  const runtime = createApprovalDraftRuntime();
  runtime.reconcile(requests);
  return { runtime, respond: async () => ({ ok: true }), requestsFor: () => requests, sendReply: async () => {}, ...extra };
};
const hosted = (host, element) => renderToStaticMarkup(React.createElement(Adapters.SidebarHoverCardHostContext.Provider, { value: host }, element));

test('SSR: the closed card renders the row as its trigger (pC: Wu around Z); no data, the row alone', () => {
  const requests = [command({ command: 'npm test', availableDecisions: ['accept', 'decline'] })];
  const row = React.createElement('div', { 'data-row-key': 'k' }, React.createElement('button', { 'data-row-main-button': '' }, 'Run tests'));
  const data = Hover.sidebarHoverCardData({ id: 't' }, { requests });
  const html = hosted(hostOf(requests), React.createElement(Hover.SidebarSessionHoverCard, { row, title: 'Run tests', data, ...Hover.sidebarHoverCardState(data) }));
  assert.match(html, /data-row-key="k"/);
  assert.match(html, /data-row-main-button=""/);
  assert.equal(renderToStaticMarkup(React.createElement(Hover.SidebarSessionHoverCard, { row, title: 'x' })), '<div data-row-key="k"><button data-row-main-button="">Run tests</button></div>');
});

test('SSR: the awaiting body draws the host approval card with Deny / Allow once only (G), live lane', () => {
  const request = command({ command: 'npm test', availableDecisions: ['accept', 'acceptForSession', 'decline'] });
  const host = hostOf([request]);
  const data = Hover.sidebarHoverCardData({ id: 't' }, { requests: [request] });
  const html = hosted(host, React.createElement(Body.AwaitingHoverCardBody, { data, toolCardResident: true }));
  assert.match(html, /<div class="pb-1"><section /);
  assert.match(html, /data-testid="approval-action-accept"/);
  assert.match(html, /data-testid="approval-action-decline"/);
  assert.doesNotMatch(html, /approval-action-acceptForSession|Always allow/);
  // jO: the request's lane.
  let lane;
  const Probe = () => { lane = Card.useHoverCardLane(data, true); return null; };
  hosted(host, React.createElement(Probe));
  assert.deepEqual(lane, { lane: 'live', requestId: '1', changeBody: false });
  hosted(host, React.createElement(() => { lane = Card.useHoverCardLane(data, false); return null; }));
  assert.equal(lane, null, 'not awaiting: no lane');
});

test('SSR: a request the card cannot show answers "Awaiting input · Open the session to respond" (ca0409d7c U)', () => {
  const request = { id: 4, method: 'item/fileChange/requestApproval', bridgeApproval: { connectionId: 'c', instanceId: 'h4' }, params: { threadId: 't', itemId: 'i', changes: [{ path: '/w/a.txt', diff: '+a' }] } };
  const data = Hover.sidebarHoverCardData({ id: 't' }, { requests: [request] });
  const html = hosted(hostOf([request]), React.createElement(Body.AwaitingHoverCardBody, { data, toolCardResident: true }));
  assert.match(html, /<div class="flex flex-col gap-0.5 px-lg py-2.5"><span class="text-body-medium text-secondary">Awaiting input<\/span><span class="text-body text-muted-as-secondary">Open the session to respond<\/span><\/div>/);
});

test('SSR: nothing pending and not requires_action: the quick reply (ca0409d7c ve / Z)', () => {
  const data = { id: 't', type: 'local', isArchived: false, pendingPermissions: 0, _originalSession: { id: 't', external_metadata: {} } };
  const html = hosted(hostOf([]), React.createElement(Body.AwaitingHoverCardBody, { data, summaryText: 'Waiting for you' }));
  assert.match(html, /aria-label="Reply to Claude"/);
  assert.match(html, /aria-label="Send reply"/);
  assert.match(html, /Claude asked/);
});
