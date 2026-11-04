import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// The Tasks pane workflow card. W14-code r4 ct-feed R4T-08b (E95): a workflow run is the desktop's N$ detailed card
// (c96d752d0 k1e, as cccc2cf0a wN draws a local_workflow task: `u(ds, {task, variant: "detailed", sessionRef, onStop,
// stopping, nested, ownLine})`); the host card's member Retry / Skip, Pause / Resume, deliverables, Configure, questions,
// compatibility notes, agent view and large-workflow warning are gone with it. The transcript row's large-workflow warning
// (WorkflowRow) stays.
const app = path.resolve(import.meta.dirname, '..');
const assets = path.join(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
const official = (prefix) => fs.readFileSync(path.join(assets, fs.readdirSync(assets).find((file) => file.startsWith(prefix) && file.endsWith('.js'))), 'utf8');
const text = (html) => html.replace(/<[^>]+>/g, '|').replace(/\|+/g, '|');
let server, W;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  (await server.ssrLoadModule('/electron/i18n/index.mjs')).setLocale?.('en-US');
  W = await server.ssrLoadModule('/src/source-workflow.jsx');
});
after(() => server?.close());

const now = Date.now();
const run = (extra = {}) => ({ id: 'attempt-1', runId: 'r1', status: 'running', name: 'audit', description: 'Audit', startedAt: now - 65000, sequence: 3,
  workflowProgress: [{ type: 'workflow_phase', index: 0, title: 'Scan' }, { type: 'workflow_phase', index: 1, title: 'Fix' },
    { type: 'workflow_agent', index: 1, id: '1', label: 'scan a', state: 'progress', phaseIndex: 0, phaseTitle: 'Scan', startedAt: now - 5000, lastProgressAt: now },
    { type: 'workflow_agent', index: 2, id: '2', label: 'scan b', state: 'error', error: 'bad', phaseIndex: 0, phaseTitle: 'Scan' }], ...extra });
const card = (r, props = {}) => renderToStaticMarkup(React.createElement(W.SourceWorkflowTask, { task: { id: 'workflow:r1', kind: 'workflow', run: r }, sessionId: 's1', onStop: async () => {}, ...props }));

test('the Tasks pane run is c96d752d0 N$ detailed: title, Workflow · time · agents, phases with their agents', () => {
  assert.ok(official('cccc2cf0a-').includes('variant:"detailed"'));
  const html = card(run());
  assert.match(html, /^<div data-task-id="workflow:r1" data-workflow-status="running">/);
  assert.match(text(html), /\|audit\|.*Workflow\|1m \d+s\|2\| agents\|Audit\|Phases\|Scan\|0\/2\|/);
  assert.match(text(html), /\|scan a\|.*\|scan b\|Error\|Fix\|/);
  assert.match(html, /<button[^>]*aria-label="[^"]*[Ss]top[^"]*"/, 'Stop while running');
  assert.doesNotMatch(html, /swf-card|swf-phase|Retry agent|Skip agent|Pause this workflow|Configure…|Deliverables|Compatibility differences/);
});

test('a failed run says why it ended; no Stop once it settled', () => {
  const html = card(run({ status: 'failed', summary: 'Workflow "audit" failed: boom', completedAt: now }));
  assert.match(text(html), /\|audit\|Workflow\|Failed\|2 agents\|Audit\|Error\|Boom\|/);
  assert.doesNotMatch(html, /aria-label="[^"]*[Ss]top[^"]*"/);
});

test('the transcript row keeps its large-workflow warning (largeWorkflow)', () => {
  const local = run({ workflowProgress: [{ type: 'workflow_agent', id: 'a', state: 'progress' }, { type: 'workflow_agent', id: 'b', state: 'progress' }, { type: 'workflow_agent', id: 'c', state: 'progress' }] });
  assert.equal(W.largeWorkflow(local, { agents: 25, tokens: 1_500_000 }), false);
  const queued = { ...local, usage: { totalTokens: 600_000 }, workflowProgress: [{ type: 'workflow_agent', id: 'a', state: 'progress' }, { type: 'workflow_agent', id: 'b', state: 'start' }, { type: 'workflow_agent', id: 'c', state: 'start' }] };
  assert.equal(W.largeWorkflow(queued, { agents: 25, tokens: 1_500_000 }), true, 'projected: 600k per started agent × 3 scheduled');
  assert.equal(W.largeWorkflow({ ...local, usage: { totalTokens: 1_600_000 } }, { agents: 25, tokens: 1_500_000 }), true, 'actual tokens');
  assert.equal(W.largeWorkflow(local, { agents: 2, tokens: 1_500_000, suppressed: true }), false, 'never in ultracode');
  assert.equal(W.largeWorkflow({ ...local, status: 'completed' }, { agents: 2, tokens: 1 }), false);
  assert.match(renderToStaticMarkup(React.createElement(W.WorkflowRow, { run: local, warningLimits: { agents: 2, tokens: 1_500_000, suppressed: false }, onOpen() {} })), /data-large-workflow=""/);
  for (const gone of ['WorkflowCard', 'WorkflowSettingsDialog', 'WorkflowSaveDialog']) assert.equal(gone in W, false, gone);
});
